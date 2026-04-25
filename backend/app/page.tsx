export default function BackendHomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>A.U.R.A Backend</h1>
      <p>This app serves the API routes for the A.U.R.A workspace.</p>
      <p>Use <code>/api/health</code> to verify that the backend is running.</p>
    </main>
  );
}
