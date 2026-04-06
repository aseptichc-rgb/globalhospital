export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">🏥</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          오프라인 상태입니다
        </h1>
        <p className="text-gray-500 mb-6">
          인터넷 연결을 확인한 후 다시 시도해 주세요.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
