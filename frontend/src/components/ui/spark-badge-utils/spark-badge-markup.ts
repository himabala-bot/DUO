export const SPARK_BADGE_MARKUP = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .badge {
      position: relative;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
      border: 1.5px solid rgba(255,255,255,0.3);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      text-align: center;
      animation: float 4s ease-in-out infinite;
    }
    .badge svg {
      width: 44px;
      height: 44px;
      fill: #fbbf24;
      filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
    }
    .badge span {
      margin-top: 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #f8fafc;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(2deg); }
    }
  </style>
</head>
<body>
  <div class="badge">
    <svg viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    <span>DUO TODO</span>
  </div>
</body>
</html>
`;
