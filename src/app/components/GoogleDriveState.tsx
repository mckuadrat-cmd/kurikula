import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { Link } from "react-router";

type DriveState = "disconnected" | "expired";

type GoogleDriveNoticeProps = {
  state: DriveState;
  message?: string;
  className?: string;
};

type GoogleDriveEmptyStateProps = {
  state: DriveState;
  title?: string;
  description?: string;
  steps?: string[];
  className?: string;
};

type EmptyDataStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  steps?: string[];
  action?: ReactNode;
  className?: string;
};

const defaultCopy = {
  disconnected: {
    title: "Google Drive Belum Terhubung",
    message: "Hubungkan Google Drive di Dashboard agar data bisa disimpan dan disinkronkan otomatis.",
    action: "Pergi ke Dashboard",
  },
  expired: {
    title: "Sesi Google Drive Kedaluwarsa",
    message: "Koneksi aman ke Google Drive sudah berakhir. Hubungkan ulang untuk melanjutkan sinkronisasi data.",
    action: "Hubungkan Ulang",
  },
};

export function GoogleDriveNotice({ state, message, className = "" }: GoogleDriveNoticeProps) {
  const copy = defaultCopy[state];
  const Icon = state === "expired" ? RefreshCw : AlertCircle;

  return (
    <div className={`bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-[12px] flex items-center gap-3 ${className}`}>
      <Icon className={`w-5 h-5 text-amber-600 flex-shrink-0 ${state === "expired" ? "animate-pulse" : ""}`} />
      <div className="text-sm flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <strong>{copy.title}:</strong> {message || copy.message}
        </div>
        <Link
          to="/dashboard"
          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors inline-block text-center cursor-pointer whitespace-nowrap self-start sm:self-center font-sans"
        >
          {copy.action}
        </Link>
      </div>
    </div>
  );
}

export function GoogleDriveEmptyState({
  state,
  title,
  description,
  steps,
  className = "",
}: GoogleDriveEmptyStateProps) {
  const copy = defaultCopy[state];
  const Icon = state === "expired" ? RefreshCw : Database;
  const defaultSteps =
    state === "expired"
      ? ["Klik tombol hubungkan ulang.", "Pilih akun Google yang sama.", "Kembali ke halaman ini dan refresh data."]
      : ["Buka Dashboard.", "Hubungkan Google Drive.", "Buat atau pilih database spreadsheet."];

  return (
    <div className={`p-8 md:p-12 text-center text-gray-500 bg-white rounded-[12px] border border-gray-200 shadow-sm flex flex-col items-center justify-center space-y-5 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
        <Icon className={`w-7 h-7 ${state === "expired" ? "text-amber-600" : ""}`} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title || copy.title}</h3>
        <p className="text-gray-600 max-w-md text-sm mt-2">{description || copy.message}</p>
      </div>
      <div className="grid gap-2 text-left max-w-md w-full">
        {(steps || defaultSteps).map((step, index) => (
          <div key={step} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-[10px] px-3 py-2">
            <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <Link
        to="/dashboard"
        className={`px-5 py-2.5 text-white rounded-[12px] font-semibold text-sm transition-colors cursor-pointer inline-block ${
          state === "expired" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {copy.action}
      </Link>
    </div>
  );
}

export function EmptyDataState({
  icon,
  title,
  description,
  steps,
  action,
  className = "",
}: EmptyDataStateProps) {
  return (
    <div className={`p-8 md:p-12 text-center text-gray-500 flex flex-col justify-center items-center space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-500 border border-gray-100 flex items-center justify-center">
        {icon || <CheckCircle2 className="w-7 h-7" />}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600 max-w-md text-sm mt-2">{description}</p>
      </div>
      {steps && steps.length > 0 && (
        <div className="grid gap-2 text-left max-w-md w-full">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-[10px] px-3 py-2">
              <span className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
      {action}
    </div>
  );
}
