// "첫 동전을 안 쓴다 / 한 개 더 쓴다"로 나누는 식은 맞지만 표가 없어서
// 조합 하나하나를 끝까지 따라가며 센다. 답이 크면 호출 수도 그만큼 커진다.
pub fn count_ways(coins: List(Int), target: Int) -> Int {
  case coins {
    _ if target == 0 -> 1
    _ if target < 0 -> 0
    [] -> 0
    [coin, ..rest] ->
      count_ways(coins, target - coin) + count_ways(rest, target)
  }
}
