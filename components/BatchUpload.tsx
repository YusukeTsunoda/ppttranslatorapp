import React, { useRef, useState } from "react";

export default function BatchUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const formData = new FormData();
    Array.from(e.target.files).forEach(file => formData.append("files", file));
    const res = await fetch("/api/batch-upload", { method: "POST", body: formData });
    const data = await res.json();
    setJobId(data.jobId);
    setProgress(0);
    setTotal(data.accepted);
    setStatus("PENDING");
    pollProgress(data.jobId);
  };

  const pollProgress = async (jobId: string) => {
    let finished = false;
    while (!finished) {
      const res = await fetch(`/api/batch-upload?jobId=${jobId}`);
      const data = await res.json();
      setProgress(data.progress);
      setTotal(data.total);
      setStatus(data.status);
      if (data.status === "COMPLETED" || data.status === "FAILED") finished = true;
      else await new Promise(r => setTimeout(r, 2000));
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        ref={inputRef}
        onChange={handleFiles}
        accept=".pptx"
        style={{ display: "none" }}
      />
      <button onClick={() => inputRef.current?.click()}>ファイル選択</button>
      {jobId && (
        <div className="mt-4">
          <div>ジョブID: {jobId}</div>
          <div>進捗: {progress} / {total}</div>
          <div>ステータス: {status}</div>
        </div>
      )}
    </div>
  );
} 