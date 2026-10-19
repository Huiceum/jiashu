// config.js
// Google AI Studio（Gemini API）設定。
// 金鑰申請：https://aistudio.google.com/apikey
//
// geminiApiKey 留空時，使用者第一次送出問題會被要求輸入自己的金鑰（只存在該瀏覽器的 localStorage）。
// 若要讓試用者免輸入就能使用，可以在這裡填入金鑰，但任何打開網頁的人都看得到它，
// 只適合本機或小範圍試用；公開部署請改由後端代理呼叫。
window.FTDL_CONFIG = {
    geminiApiKey: '',
    geminiModel: 'gemini-flash-latest',
    temperature: 0.2,
    maxRepairAttempts: 1,     // AI 產生的 FTDL 驗證失敗時，自動請模型修正的次數
    networkRetries: 2,        // 連線中斷時自動重試的次數
    requestTimeoutMs: 90000   // 單次請求的等待上限（毫秒）
};
