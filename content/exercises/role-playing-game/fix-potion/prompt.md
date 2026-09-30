게임 상점에서 파는 마나 물약을 마시는 함수 `drink_potion(player: Player, amount: Int) -> Option(Player)`가 이미 작성되어 있습니다. 그런데 전사처럼 마나를 쓰지 않는 직업이 물약을 마시면 갑자기 마나가 생기는 버그가 보고되었습니다. 코드를 고치세요.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

올바른 규칙은 다음과 같습니다. `amount`는 0 이상입니다.

- 마나가 `Some(mana)`이면 마나가 `amount`만큼 늘어난 플레이어를 `Some`으로 반환한다. 마나는 100을 넘지 않는다.
- 마나가 `Some(0)`이어도 마나가 있는 직업이므로 물약을 마실 수 있다.
- 마나가 `None`이면 물약을 마실 수 없으므로 `None`을 반환한다.
- 이름, 레벨, 체력은 바뀌지 않는다.

```gleam
drink_potion(Player(name: None, level: 3, health: 50, mana: Some(90)), 30)
// -> Some(Player(name: None, level: 3, health: 50, mana: Some(100)))

drink_potion(Player(name: None, level: 3, health: 50, mana: None), 30)
// -> None
```
