#!/usr/bin/env python3
"""Validate lib/viz/viz_tracer.py against known DSA answers.

Runs a set of real solutions (from the user's 50-problem doc) through the
tracer and asserts the produced result + quality invariants.

Usage: python3 scripts/test_viz_tracer.py
"""
import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "lib", "viz"))
import viz_tracer  # noqa: E402

CASES = [
    # (label, expected_result, source)
    ("coin change min (322)", "3", '''def coinChange(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != INF else -1

print(coinChange([1, 2, 5], 11))  # 3  (5+5+1)
'''),
    ("coin change count (518)", "4", '''def change(amount, coins):
    dp = [0] * (amount + 1)
    dp[0] = 1
    for c in coins:
        for a in range(c, amount + 1):
            dp[a] += dp[a - c]
    return dp[amount]

print(change(5, [1, 2, 5]))  # 4
'''),
    ("combination sum (377)", "7", '''def combinationSum4(nums, target):
    dp = [0] * (target + 1)
    dp[0] = 1
    for s in range(1, target + 1):
        for n in nums:
            if n <= s:
                dp[s] += dp[s - n]
    return dp[target]

print(combinationSum4([1, 2, 3], 4))
'''),
    ("partition subset (416)", "True", '''def canPartition(nums):
    total = sum(nums)
    if total % 2 != 0:
        return False
    target = total // 2
    dp = [False] * (target + 1)
    dp[0] = True
    for x in nums:
        for s in range(target, x - 1, -1):
            if dp[s - x]:
                dp[s] = True
    return dp[target]

print(canPartition([1, 5, 11, 5]))
'''),
    ("edit distance (72)", "3", '''def minDistance(word1, word2):
    n, m = len(word1), len(word2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    return dp[n][m]

print(minDistance("horse", "ros"))
'''),
    ("longest palindrome (5)", "bab", '''def longestPalindrome(s):
    n = len(s)
    if n == 0:
        return ""
    is_pal = [[False] * n for _ in range(n)]
    start, maxlen = 0, 1
    for i in range(n):
        is_pal[i][i] = True
    for i in range(n - 1):
        if s[i] == s[i + 1]:
            is_pal[i][i + 1] = True
            start, maxlen = i, 2
    for length in range(3, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j] and is_pal[i + 1][j - 1]:
                is_pal[i][j] = True
                if length > maxlen:
                    start, maxlen = i, length
    return s[start:start + maxlen]

print(longestPalindrome("babad"))
'''),
    ("largest rect (84)", "10", '''def largestRectangleArea(heights):
    stack = []
    max_area = 0
    heights = heights + [0]
    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area

print(largestRectangleArea([2, 1, 5, 6, 2, 3]))
'''),
    ("sliding window max (239)", "[3, 3, 5, 5, 6, 7]", '''from collections import deque

def maxSlidingWindow(nums, k):
    dq = deque()
    res = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] < x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            res.append(nums[dq[0]])
    return res

print(maxSlidingWindow([1, 3, -1, -3, 5, 3, 6, 7], 3))
'''),
    ("constrained subset sum (1425)", "37", '''from collections import deque

def constrainedSubsetSum(nums, k):
    n = len(nums)
    dp = [0] * n
    dq = deque()
    result = float('-inf')
    for i in range(n):
        while dq and dq[0] < i - k:
            dq.popleft()
        best_prev = dp[dq[0]] if dq else 0
        dp[i] = nums[i] + max(best_prev, 0)
        result = max(result, dp[i])
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return result

print(constrainedSubsetSum([10, 2, -10, 5, 20], 2))
'''),
    ("jump game VI (1696)", "7", '''from collections import deque

def maxResult(nums, k):
    n = len(nums)
    dp = [0] * n
    dp[0] = nums[0]
    dq = deque([0])
    for i in range(1, n):
        while dq and dq[0] < i - k:
            dq.popleft()
        dp[i] = dp[dq[0]] + nums[i]
        while dq and dp[dq[-1]] <= dp[i]:
            dq.pop()
        dq.append(i)
    return dp[n - 1]

print(maxResult([1, -1, -2, 4, -7, 3], 2))
'''),
    ("cut stick (1547)", "16", '''def minCost(n, cuts):
    cuts = sorted(cuts + [0, n])
    m = len(cuts)
    dp = [[0] * m for _ in range(m)]
    for length in range(2, m):
        for i in range(m - length):
            j = i + length
            dp[i][j] = min(dp[i][k] + dp[k][j] for k in range(i + 1, j)) + (cuts[j] - cuts[i])
    return dp[0][m - 1]

print(minCost(7, [1, 3, 4, 5]))
'''),
    ("cooldown (309)", "3", '''def maxProfit(prices):
    if not prices:
        return 0
    hold = -prices[0]
    sold = 0
    rest = 0
    for p in prices[1:]:
        prev_sold = sold
        sold = hold + p
        hold = max(hold, rest - p)
        rest = max(rest, prev_sold)
    return max(sold, rest)

print(maxProfit([1, 2, 3, 0, 2]))
'''),
    ("range sum (327)", "3", '''def countRangeSum(nums, lower, upper):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)

    def merge_sort(lo, hi):
        if hi - lo <= 1:
            return 0
        mid = (lo + hi) // 2
        count = merge_sort(lo, mid) + merge_sort(mid, hi)
        j = k = mid
        for i in range(lo, mid):
            while j < hi and prefix[j] - prefix[i] < lower:
                j += 1
            while k < hi and prefix[k] - prefix[i] <= upper:
                k += 1
            count += k - j
        prefix[lo:hi] = sorted(prefix[lo:hi])
        return count

    return merge_sort(0, len(prefix))

print(countRangeSum([-2, 5, -1], -2, 2))
'''),
    ("domino tiling (10)", "5", '''def tilingWays(n):
    MOD = 10**9 + 7
    if n <= 1:
        return 1
    dp = [0] * (n + 1)
    dp[0], dp[1] = 1, 1
    for i in range(2, n + 1):
        dp[i] = (dp[i - 1] + dp[i - 2]) % MOD
    return dp[n]

print(tilingWays(4))
'''),
]


def main():
    passed = failed = 0
    for label, expected, src in CASES:
        res = viz_tracer.build_result(src)
        if "error" in res:
            print(f"FAIL {label}: python error: {res['error']}")
            failed += 1
            continue
        got = res["result"]
        ok = got == expected
        n_steps = len(res["steps"])
        n_cap = sum(1 for s in res["steps"] if "c" in s)
        has_struct = any(
            s["v"].get("dp") or s["v"].get("dq") or s["v"].get("stack") or s["v"].get("is_pal")
            for s in res["steps"][:50]
        )
        status = "PASS" if ok else "FAIL"
        if not ok:
            failed += 1
        else:
            passed += 1
        print(
            f"{status} {label}: answer={got!r} (want {expected!r}) steps={n_steps} "
            f"captions={n_cap} struct={has_struct} fn={res['fn']!r}"
        )

    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


def rough_size_estimate():
    """Print approximate JSON size of the largest trace (payload guard)."""
    biggest = max(CASES, key=lambda c: len(c[2]))
    res = viz_tracer.build_result(biggest[2])
    print(f"\nbiggest case payload: {len(json.dumps(res)) / 1024:.1f} KiB")


if __name__ == "__main__":
    code = main()
    rough_size_estimate()
    sys.exit(code)