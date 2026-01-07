"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as XLSX from "xlsx";

interface ExcelRow {
  address?: string;
  workOrderId?: string;
}

export default function UploadPage() {
  const { user: clerkUser } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [selectedCompletingTeamId, setSelectedCompletingTeamId] = useState<Id<"taskForces"> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const [preview, setPreview] = useState<ExcelRow[]>([]);

  // Get current logged in user (uses auth context)
  const user = useQuery(api.users.getCurrentUser);

  // Get organization ID from user
  const organizationId = user?.organizationIds?.[0]?.organizationId;

  // Get projects for the organization
  const projects = useQuery(
    api.projects.getProjectsForCurrentUser,
    organizationId
      ? {
        organizationId,
      }
      : "skip"
  );

  // Get teams for the organization
  const teams = useQuery(
    api.taskForces.getTaskForces,
    organizationId ? { organizationId } : "skip"
  );

  // Mutation for bulk insert
  const bulkInsert = useMutation(api.woidAssignments.bulkInsertFromExcel);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileExtension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      alert("Please select a valid Excel file (.xlsx, .xls) or CSV file (.csv)");
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setPreview([]);

    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let workbook: XLSX.WorkBook;
        if (fileExtension === ".csv") {
          // For CSV, read as string
          const csvText = e.target?.result as string;
          workbook = XLSX.read(csvText, { type: "string" });
        } else {
          // For Excel files, read as ArrayBuffer
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: "array" });
        }

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON array (header: 1 means array of arrays, not objects)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
        }) as any[];

        if (jsonData.length === 0) {
          alert("The file appears to be empty");
          return;
        }

        // First row should be headers, skip it for preview
        const headers = jsonData[0] as string[];
        const previewRows: ExcelRow[] = [];

        // Find column indices for address and workOrderId (case-insensitive)
        const addressIndex = headers.findIndex(
          (h) => h?.toString().toLowerCase() === "address"
        );
        const workOrderIdIndex = headers.findIndex(
          (h) => h?.toString().toLowerCase() === "workorderid" ||
            h?.toString().toLowerCase() === "work_order_id" ||
            h?.toString().toLowerCase() === "woid"
        );

        if (addressIndex === -1 || workOrderIdIndex === -1) {
          alert(
            "Please ensure your Excel file has columns named 'address' (or 'Address') and 'workOrderId' (or 'work_order_id' or 'woid')"
          );
          return;
        }

        // Preview first 5 rows
        for (let i = 1; i < Math.min(jsonData.length, 6); i++) {
          const row = jsonData[i] as any[];
          previewRows.push({
            address: row[addressIndex]?.toString().trim() || "",
            workOrderId: row[workOrderIdIndex]?.toString().trim() || "",
          });
        }

        setPreview(previewRows);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error reading file. Please make sure it's a valid Excel file.");
      }
    };

    // Read file based on type
    if (fileExtension === ".csv") {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedProjectId || !selectedCompletingTeamId) {
      alert("Please select a file, a project, and a completing team");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Read file content
      const fileExtension = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();

      const readFile = (): Promise<Uint8Array | string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (fileExtension === ".csv") {
              // For CSV, read as string
              resolve(e.target?.result as string);
            } else {
              // For Excel files, read as ArrayBuffer
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              resolve(data);
            }
          };
          reader.onerror = reject;
          if (fileExtension === ".csv") {
            reader.readAsText(file);
          } else {
            reader.readAsArrayBuffer(file);
          }
        });
      };

      const fileData = await readFile();
      let workbook: XLSX.WorkBook;

      if (fileExtension === ".csv") {
        // Parse CSV using XLSX
        workbook = XLSX.read(fileData as string, { type: "string" });
      } else {
        workbook = XLSX.read(fileData as Uint8Array, { type: "array" });
      }

      // Get the first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
        header: 1,
        defval: "",
      });

      if (jsonData.length < 2) {
        alert("The file must have at least a header row and one data row");
        setUploading(false);
        return;
      }

      // Get headers (first row)
      const headers = (jsonData[0] as any[]).map((h) =>
        h?.toString().trim().toLowerCase()
      );

      // Find column indices
      const addressIndex = headers.findIndex(
        (h) => h === "address"
      );
      const workOrderIdIndex = headers.findIndex(
        (h) => h === "workorderid" || h === "work_order_id" || h === "woid"
      );

      if (addressIndex === -1 || workOrderIdIndex === -1) {
        alert(
          "Please ensure your Excel file has columns named 'address' and 'workOrderId' (case-insensitive)"
        );
        setUploading(false);
        return;
      }

      // Parse rows into assignments array
      const assignments: { address: string; workOrderId: string }[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        const address = row[addressIndex]?.toString().trim();
        const workOrderId = row[workOrderIdIndex]?.toString().trim();

        if (address && workOrderId) {
          assignments.push({
            address,
            workOrderId,
          });
        }
      }

      if (assignments.length === 0) {
        alert("No valid rows found in the file");
        setUploading(false);
        return;
      }

      // Call mutation
      const uploadResult = await bulkInsert({
        assignments,
        projectId: selectedProjectId,
        completingTeamId: selectedCompletingTeamId,
      });

      setResult(uploadResult);
      setFile(null);
      setPreview([]);
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        `Error uploading file: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Upload WOID Assignments
        </h1>

        <div className="space-y-6">
          {/* Project Selection */}
          <div>
            <label
              htmlFor="project"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Project <span className="text-red-500">*</span>
            </label>
            <select
              id="project"
              value={selectedProjectId || ""}
              onChange={(e) =>
                setSelectedProjectId(e.target.value as Id<"projects"> | null)
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 text-sm font-medium"
              disabled={!organizationId || projects === undefined}
              style={{
                color: selectedProjectId ? '#111827' : '#6B7280'
              }}
            >
              <option value="" className="text-gray-500">
                {!organizationId
                  ? "Loading user..."
                  : projects === undefined
                    ? "Loading projects..."
                    : projects.length === 0
                      ? "No projects available"
                      : "Select a project..."}
              </option>
              {projects?.map((project: { _id: Id<"projects">; name: string }) => (
                <option key={project._id} value={project._id} className="text-gray-900">
                  {project.name}
                </option>
              ))}
            </select>
            {selectedProjectId && projects && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: <span className="font-semibold text-gray-900">
                  {projects.find(
                    (p: { _id: Id<"projects">; name: string }) =>
                      p._id === selectedProjectId
                  )?.name}
                </span>
              </p>
            )}
            {user && !organizationId && (
              <p className="mt-2 text-sm text-yellow-600">
                User is not associated with any organization.
              </p>
            )}
            {organizationId && projects && projects.length === 0 && (
              <p className="mt-2 text-sm text-gray-600">
                No projects found for your organization.
              </p>
            )}
          </div>

          {/* Completing Team Selection */}
          <div>
            <label
              htmlFor="completingTeam"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Completing Team <span className="text-red-500">*</span>
            </label>
            <select
              id="completingTeam"
              value={selectedCompletingTeamId || ""}
              onChange={(e) =>
                setSelectedCompletingTeamId(e.target.value as Id<"taskForces"> | null)
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 text-sm font-medium"
              disabled={!organizationId || teams === undefined}
              style={{
                color: selectedCompletingTeamId ? '#111827' : '#6B7280'
              }}
            >
              <option value="" className="text-gray-500">
                {!organizationId
                  ? "Loading user..."
                  : teams === undefined
                    ? "Loading teams..."
                    : teams.length === 0
                      ? "No teams available"
                      : "Select completing team..."}
              </option>
              {teams?.map((team: { _id: Id<"taskForces">; name: string }) => (
                <option key={team._id} value={team._id} className="text-gray-900">
                  {team.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              The team whose completion status determines if an address is complete
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Excel File <span className="text-red-500">*</span>
            </label>
            <input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              disabled={uploading}
            />
            <p className="mt-2 text-sm text-gray-500">
              Upload an Excel file (.xlsx, .xls) or CSV file (.csv) with columns:
              <strong> address</strong> and <strong>workOrderId</strong> (or
              <strong> work_order_id</strong> or <strong>woid</strong>)
            </p>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Preview (first 5 rows)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Work Order ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {row.address || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {row.workOrderId || <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !selectedProjectId || !selectedCompletingTeamId || uploading}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload Assignments"}
          </button>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Upload Results
              </h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium text-green-600">
                    Created: {result.created}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-blue-600">
                    Updated: {result.updated}
                  </span>
                </p>
                {result.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">
                      Errors ({result.errors.length}):
                    </p>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... and {result.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

