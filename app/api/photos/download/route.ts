import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import JSZip from "jszip";

export const runtime = "nodejs";
export const maxDuration = 300;

type Photo = { url: string; name: string };
type AddressGroup = { address: string; photos: Photo[] };
type DateGroup = { date: number; addresses: AddressGroup[] };
type TeamGroup = {
  taskForceId: string | null;
  teamName: string;
  dates: DateGroup[];
};

function sanitize(s: string): string {
  return (s || "untitled").replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 80).trim();
}

function ymd(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const sp = req.nextUrl.searchParams;
  const projectId = sp.get("projectId");
  if (!projectId) return new NextResponse("Missing projectId", { status: 400 });

  // Scope filters (all optional — narrower scope = fewer photos).
  const scopeTeam = sp.get("taskForceId"); // "unassigned" | <id> | null(all)
  const scopeDate = sp.get("date"); // ms timestamp string | null
  const scopeAddress = sp.get("address"); // string | null

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return new NextResponse("Convex URL not configured", { status: 500 });
  const client = new ConvexHttpClient(convexUrl);

  let teams: TeamGroup[];
  try {
    teams = (await client.query(api.projectPhotos.getByTeamForProject, {
      projectId: projectId as never,
    })) as TeamGroup[];
  } catch {
    return new NextResponse("Failed to load photos", { status: 500 });
  }

  // Collect photos within scope, with descriptive zip paths.
  const items: Array<{ path: string; url: string }> = [];
  for (const team of teams) {
    const teamKey = team.taskForceId ?? "unassigned";
    if (scopeTeam && teamKey !== scopeTeam) continue;
    for (const dg of team.dates) {
      if (scopeDate && String(dg.date) !== scopeDate) continue;
      for (const ag of dg.addresses) {
        if (scopeAddress && ag.address !== scopeAddress) continue;
        ag.photos.forEach((p, i) => {
          const base = sanitize(p.name) || `photo-${i + 1}.jpg`;
          const named = /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.jpg`;
          const path = `${sanitize(team.teamName)}/${ymd(dg.date)}/${sanitize(
            ag.address
          )}/${i + 1}-${named}`;
          items.push({ path, url: p.url });
        });
      }
    }
  }

  if (items.length === 0) {
    return new NextResponse("No photos for the requested scope", { status: 404 });
  }

  const zip = new JSZip();
  let ok = 0;
  // Fetch server-side (no browser CORS). Bounded concurrency.
  const CONCURRENCY = 8;
  let idx = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (idx < items.length) {
        const { path, url } = items[idx++];
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          zip.file(path, buf);
          ok++;
        } catch {
          // skip unreachable image
        }
      }
    })
  );

  if (ok === 0) {
    return new NextResponse("Could not fetch any images", { status: 502 });
  }

  const blob = await zip.generateAsync({ type: "uint8array" });

  const labelParts = [
    scopeAddress ? sanitize(scopeAddress) : null,
    scopeDate ? ymd(Number(scopeDate)) : null,
    !scopeAddress && !scopeDate ? "photos" : null,
  ].filter(Boolean);
  const filename = `${labelParts.join("_") || "photos"}.zip`;

  return new NextResponse(blob as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(blob.byteLength),
    },
  });
}
