롤플레잉 게임의 플레이어는 다음 타입으로 표현됩니다. 이름을 숨긴 플레이어도 있고, 마나를 쓰지 않는 직업도 있어서 `name`과 `mana`는 `Option`입니다.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

두 함수를 구현하세요.

**`introduce(player: Player) -> String`**

- 이름이 `Some(name)`이면 `name`을 반환한다.
- 이름이 `None`이면 `"Mighty Magician"`을 반환한다.

**`revive(player: Player) -> Option(Player)`**

- 체력(`health`)이 0인 플레이어만 되살린다. 체력이 1 이상이면 `None`을 반환한다.
- 되살린 플레이어는 체력이 100이다.
- 레벨이 10 이상이면 마나를 `Some(100)`으로 채운다. 원래 마나가 `None`이어도 `Some(100)`이 된다.
- 레벨이 10 미만이면 마나는 원래 값 그대로 둔다.
- 이름과 레벨은 바뀌지 않는다.

```gleam
revive(Player(name: None, level: 3, health: 0, mana: None))
// -> Some(Player(name: None, level: 3, health: 100, mana: None))

revive(Player(name: None, level: 3, health: 42, mana: None))
// -> None
```
