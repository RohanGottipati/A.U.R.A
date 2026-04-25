import Link from "next/link";
import UploadForm from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-foreground/60 transition hover:text-foreground"
        >
          &larr; Back to Home
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Create Your 3D Space
        </h1>
        <p className="mt-2 text-foreground/60">
          Upload a floor plan image and describe how you want to configure the space.
        </p>
      </div>

      <UploadForm />
    </main>
  );
}
