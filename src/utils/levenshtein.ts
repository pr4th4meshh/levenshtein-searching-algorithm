export function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
  
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
  
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : Math.min(
                dp[i - 1][j - 1] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j] + 1
              );
      }
    }
  
    return dp[m][n];
  }
  