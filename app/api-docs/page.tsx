"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.replace("/");
    }
  }, [router]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="min-h-screen">
      <SwaggerUI url="/api/docs" />
    </div>
  );
}
