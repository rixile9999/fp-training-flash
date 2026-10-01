请用列表拉链实现一个在音乐应用的播放列表中指向“当前歌曲”的光标。光标类型以及 `from_list`、`current` 已经提供。

```gleam
pub opaque type Cursor(a) {
  Cursor(before: List(a), current: a, after: List(a))
}
```

`before` **从离当前歌曲最近的开始**（原来顺序的逆序）存放当前歌曲之前的歌曲，`after` 按原来的顺序存放当前歌曲之后的歌曲。请实现下面四个函数。

- `next(cursor)`：移到下一首歌。是最后一首时返回 `Error(Nil)`。
- `previous(cursor)`：移到前一首歌。是第一首时返回 `Error(Nil)`。
- `to_list(cursor)`：按原来的顺序返回整个播放列表。
- `remove_current(cursor)`：从列表中删除当前歌曲。有下一首歌时由它成为当前歌曲，没有时由前一首歌成为当前歌曲。只有一首歌时返回 `Error(Nil)`。

`next`、`previous`、`remove_current` 必须是 O(1)。评测时会测量把 16,000 首歌一直切到最后再回到开头的开销。

```gleam
let assert Ok(c) = from_list(["春", "夏", "秋"])
let assert Ok(c) = next(c)           // 当前歌曲："夏"，before: ["春"]，after: ["秋"]
let assert Ok(c) = remove_current(c) // 当前歌曲："秋"
to_list(c)                           // -> ["春", "秋"]
```
