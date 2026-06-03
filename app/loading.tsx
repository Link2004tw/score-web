export default function LoadingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="text-muted-foreground" role="status" aria-live="polite">
        Loading...
      </p>
    </div>
  );
}
