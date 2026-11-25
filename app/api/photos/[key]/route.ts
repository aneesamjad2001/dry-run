import { getPhoto } from "@/lib/data";
import { apiViewer } from "@/lib/viewer";

// Serves one person's photo. Only signed-in UChicago students get anything, and only
// with the photo's random key, which the server hands out alongside that person's name
// (their own pages, an invite from them, a dry run with them).
export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const v = await apiViewer({ needProfile: false });
  if (v instanceof Response) return v;
  const { key } = await ctx.params;
  const jpeg = await getPhoto(key).catch(() => null);
  if (!jpeg) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      // The key changes when the photo does, so the browser may keep this copy.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
