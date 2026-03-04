"use client";

import { useState } from "react";
import { colors } from "@/lib/colors";

export default function EmailParserDebug() {
  const [emailText, setEmailText] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("test@example.com");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("https://build-simpli-1177786806.us-central1.run.app/public/debug/parse-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailText,
          subject,
          from,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to parse email");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleNY811Email = () => {
    setSubject("Fwd: Ticket: 260330876");
    setFrom("ny@occinc.com");
    setEmailText(`New York 811 Ticket No:	260330876	ROUTINE	 Original Call Date:	2/02/26	Time:    10:02 AM	WEB Start Date:	2/05/26	Time:     7:00 AM	Lead Time:    20 Caller Information Company:	BIB SERVICES CORP	Type:	CONTRACTOR Contact Name:	NICOLAOS KONTOS	Contact Phone:	(438)869-4175 Field Contact:	NICOLAOS KONTOS	Alt. Phone:	(438)869-4175 Best Time:		Fax Phone:	 Address:	1811 BELLMORE AVE; BELLMORE, NY 11710 Email Address:	permitsbibservicescorp@gmail.com Dig Site Information Type of Work:	TREE REMOVAL	 	 Type of Equipment:	BOBCAT	 	 Job Number:		 	 Work Being Done For:	NYCDPR	 	 In Street:   X	On Sidewalk:   X	Private Property:   X	Other: Front: X	Rear:	Side:	 Dig Site Location State:	NY	County:	RICHMOND Place:	STATEN ISLAND	 	 Dig Street:	95 AVENUE	Address:	111-004 Nearest Intersecting Street:	VERNON AVE	 	 Second Intersecting Street:	MARCY AVE`);
  };

  const loadSampleCode53Email = () => {
    setSubject("Code 53 - Ticket #12345");
    setFrom("permits@nyc.gov");
    setEmailText(`Code 53 Utility Update
Ticket #12345
Address: 123 MAIN STREET
Date: 02/06/2026

Utility Updates:
Con Edison - CLEARED
Verizon - IN PROGRESS
National Grid - PENDING`);
  };

  const getHighlightedText = (): Array<{ text: string; isMatch: boolean; field?: string; value?: string }> => {
    if (!result || !result.highlightedSections || !emailText || result.highlightedSections.length === 0) {
      return [{ text: emailText, isMatch: false }];
    }

    const sections = result.highlightedSections;
    let lastIndex = 0;
    const parts: Array<{ text: string; isMatch: boolean; field?: string; value?: string }> = [];

    sections.forEach((section: any, idx: number) => {
      // Add text before this match
      if (section.index > lastIndex) {
        parts.push({
          text: emailText.substring(lastIndex, section.index),
          isMatch: false,
        });
      }

      // Add the matched text
      parts.push({
        text: section.match,
        isMatch: true,
        field: section.field,
        value: section.value,
      });

      lastIndex = section.index + section.match.length;
    });

    // Add remaining text
    if (lastIndex < emailText.length) {
      parts.push({
        text: emailText.substring(lastIndex),
        isMatch: false,
      });
    }

    return parts;
  };

  const fieldColors: Record<string, string> = {
    ticketNumber: "bg-blue-200 border-blue-500",
    relocateOf: "bg-orange-200 border-orange-500",
    address: "bg-green-200 border-green-500",
    startDate: "bg-purple-200 border-purple-500",
    utilityStatus: "bg-yellow-200 border-yellow-500",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Parser Debug Tool
          </h1>
          <p className="text-gray-600">
            Test email parsing without sending actual emails. Paste email content below and see what gets extracted.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Email Input</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="sender@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Body
                  </label>
                  <textarea
                    value={emailText}
                    onChange={(e) => setEmailText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={15}
                    placeholder="Paste email content here..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={loadSampleNY811Email}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    Load NY811 Sample
                  </button>
                  <button
                    onClick={loadSampleCode53Email}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    Load Code 53 Sample
                  </button>
                  <button
                    onClick={() => {
                      setEmailText("");
                      setSubject("");
                      setFrom("test@example.com");
                      setResult(null);
                      setError(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm"
                  >
                    Clear
                  </button>
                </div>

                <button
                  onClick={handleParse}
                  disabled={loading || !emailText}
                  className={`w-full py-3 rounded-md font-semibold transition ${
                    loading || !emailText
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : `bg-[${colors.primary}] text-white hover:opacity-90`
                  }`}
                  style={{
                    backgroundColor: loading || !emailText ? undefined : colors.primary,
                  }}
                >
                  {loading ? "Parsing..." : "Parse Email"}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {result && (
              <>
                {/* Parser Info */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Parser Used</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <span className="font-mono text-sm font-semibold text-blue-800">
                      {result.parserUsed}
                    </span>
                  </div>
                </div>

                {/* Parsed Data */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Parsed Data</h2>
                  <div className="space-y-3">
                    {result.parsed.ticketNumber && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Ticket Number:</span>
                        <div className="mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md font-mono text-sm text-gray-900">
                          {result.parsed.ticketNumber}
                        </div>
                      </div>
                    )}

                    {result.parsed.relocateOf && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Relocate Of (Old Ticket):</span>
                        <div className="mt-1 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md font-mono text-sm text-gray-900">
                          {result.parsed.relocateOf}
                        </div>
                      </div>
                    )}

                    {result.parsed.address && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Address:</span>
                        <div className="mt-1 px-3 py-2 bg-green-50 border border-green-200 rounded-md font-mono text-sm text-gray-900">
                          {result.parsed.address}
                        </div>
                      </div>
                    )}

                    {result.parsed.startDate && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Start Date:</span>
                        <div className="mt-1 px-3 py-2 bg-purple-50 border border-purple-200 rounded-md font-mono text-sm text-gray-900">
                          {new Date(result.parsed.startDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {result.parsed.ticketType && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Ticket Type:</span>
                        <div className="mt-1 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md font-mono text-sm text-gray-900">
                          {result.parsed.ticketType}
                        </div>
                      </div>
                    )}

                    {result.parsed.utilityStatuses && result.parsed.utilityStatuses.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Utility Statuses:</span>
                        <div className="mt-1 space-y-2">
                          {result.parsed.utilityStatuses.map((status: any, idx: number) => (
                            <div
                              key={idx}
                              className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md"
                            >
                              <div className="font-semibold text-sm text-gray-900">{status.company}</div>
                              <div className="text-sm text-gray-700">{status.status}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-sm font-medium text-gray-600">Valid:</span>
                      <div className="mt-1">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            result.parsed.isValid
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {result.parsed.isValid ? "✓ Valid" : "✗ Invalid"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlighted Text */}
                {result.highlightedSections && result.highlightedSections.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4">Highlighted Matches</h2>
                    
                    {/* Legend */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-200 border border-blue-500 rounded"></div>
                        <span className="text-xs text-gray-600">Ticket Number</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-200 border border-orange-500 rounded"></div>
                        <span className="text-xs text-gray-600">Relocate Of</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-200 border border-green-500 rounded"></div>
                        <span className="text-xs text-gray-600">Address</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-purple-200 border border-purple-500 rounded"></div>
                        <span className="text-xs text-gray-600">Start Date</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-200 border border-yellow-500 rounded"></div>
                        <span className="text-xs text-gray-600">Utility Status</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-96">
                      {getHighlightedText().map((part, idx) => (
                        <span
                          key={idx}
                          className={
                            part.isMatch
                              ? `${fieldColors[part.field || ""] || "bg-gray-200"} border-2 rounded px-1`
                              : "text-gray-900"
                          }
                          title={part.isMatch ? `${part.field}: ${part.value}` : undefined}
                        >
                          {part.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="bg-white rounded-lg shadow-md p-6">
                  <summary className="text-xl font-semibold cursor-pointer">
                    Raw JSON Response
                  </summary>
                  <pre className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
