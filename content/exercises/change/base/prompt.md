거스름돈을 가장 적은 개수의 동전으로 주려고 합니다. 사용할 수 있는 동전 액면 목록과 거슬러 줄 금액을 받아, 동전 개수가 가장 적은 조합을 구하세요.

```gleam
pub type ChangeError {
  ImpossibleTarget
}

pub fn find_fewest_coins(coins: List(Int), target: Int) -> Result(List(Int), ChangeError)
```

- 각 액면의 동전은 몇 개든 쓸 수 있다. `coins`는 서로 다른 양의 정수다.
- 동전 개수가 가장 적은 조합을 **오름차순** 목록으로 `Ok`에 담아 반환한다. (테스트 입력에서는 가장 적은 조합이 하나뿐이다.)
- `target`이 0이면 `Ok([])`이다.
- 어떤 조합으로도 만들 수 없거나 `target`이 음수면 `Error(ImpossibleTarget)`이다.
- 가장 큰 동전부터 고르는 방법은 항상 최적이 아니다. 금액이 999여도 시간 제한 안에 끝나야 한다.

```gleam
find_fewest_coins([1, 4, 15, 20, 50], 23)
// -> Ok([4, 4, 15])
// 큰 동전부터 고르면 20 + 1 + 1 + 1로 4개지만, 4 + 4 + 15는 3개다.
```
