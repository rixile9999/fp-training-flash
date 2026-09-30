플레이어가 주문을 시전하는 함수 `cast_spell(player: Player, cost: Int) -> #(Player, Int)`를 구현하세요. 반환값은 시전 뒤의 플레이어와 주문이 준 피해량입니다. `cost`는 0 이상입니다.

```gleam
pub type Player {
  Player(name: Option(String), level: Int, health: Int, mana: Option(Int))
}
```

규칙은 마나 상태에 따라 셋으로 나뉩니다.

- **마나가 `Some(mana)`이고 `mana >= cost`**: 마나가 `cost`만큼 줄고, 피해량은 `cost * 2`이다.
- **마나가 `Some(mana)`이고 `mana < cost`**: 아무 일도 일어나지 않는다. 플레이어는 그대로이고 피해량은 0이다.
- **마나가 `None`** (마나를 쓰지 않는 직업): 체력이 `cost`만큼 줄고 피해량은 0이다. 체력은 0보다 작아지지 않는다.

`Some(0)`은 "마나가 바닥남"이고 `None`은 "마나가 아예 없음"입니다. 둘은 다른 규칙을 따릅니다.

```gleam
cast_spell(Player(name: None, level: 18, health: 123, mana: Some(30)), 14)
// -> #(Player(name: None, level: 18, health: 123, mana: Some(16)), 28)
```
