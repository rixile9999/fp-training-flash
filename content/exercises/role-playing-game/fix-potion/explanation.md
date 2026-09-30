버그의 원인은 첫 줄의 `option.unwrap(player.mana, 0)`입니다. 이 줄을 지나면 "마나가 없는 직업"(`None`)과 "마나가 바닥난 마법사"(`Some(0)`)가 똑같이 `0`이 되고, 이어지는 코드는 모든 플레이어에게 `Some(...)` 마나를 만들어 줍니다. `Option`이 담고 있던 "없음"이라는 정보를 기본값으로 덮어써서 잃어버린 것입니다.

고친 코드는 `player.mana`를 먼저 `Some`과 `None`으로 나누고, `Some`일 때만 새 플레이어를 만듭니다.

```gleam
case player.mana {
  Some(mana) -> Some(Player(..player, mana: Some(int.min(mana + amount, max_mana))))
  None -> None
}
```

같은 뜻을 `option.map(player.mana, fn(mana) { Player(..player, mana: Some(...)) })`로도 쓸 수 있습니다. `map`은 `None`을 그대로 통과시키므로 "마실 수 없음"이 자동으로 유지됩니다.

고치면서 흔히 생기는 실수가 두 가지 있습니다.

- `unwrap` 결과가 `0`이면 `None`을 돌려주도록 바꾸는 것: 이번에는 `Some(0)`인 마법사가 물약을 못 마시게 됩니다. 0과 없음은 여전히 섞여 있습니다.
- `None`일 때 `Some(player)`를 돌려주는 것: 호출하는 쪽은 "물약을 마셨다"와 "마실 수 없었다"를 구분할 수 없습니다.

`unwrap`은 "없으면 이 값으로 대신해도 결과가 똑같이 옳다"는 확신이 있을 때만 씁니다. 이론 노트 "전체 함수와 부분 함수"(total-vs-partial-functions)에서 반환 타입으로 실패를 드러내는 이유를 더 볼 수 있습니다.
