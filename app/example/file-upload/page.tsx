"use client";

import { useState } from "react";


export default function UploadForm() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Get presigned URL from API
    const res = await fetch(`/api/example/storage/upload?key=${file.name}`);
    const { url } = await res.json();

    // Upload directly to Spaces
    await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    setFileUrl(url.split("?")[0]); // public file URL
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {fileUrl && <a href={fileUrl} target="_blank">Uploaded File</a>}
    </div>
  );
}
