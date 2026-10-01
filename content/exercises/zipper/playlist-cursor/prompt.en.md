Build a cursor that points to the "current song" in a music app's playlist, as a list zipper. The cursor type, `from_list` and `current` already exist.

```gleam
pub opaque type Cursor(a) {
  Cursor(before: List(a), current: a, after: List(a))
}
```

`before` holds the songs before the current song **starting with the one nearest to it** (the reverse of the original order), and `after` holds the songs after the current song in the original order. Implement the following four functions.

- `next(cursor)`: move to the next song. `Error(Nil)` on the last song.
- `previous(cursor)`: move to the previous song. `Error(Nil)` on the first song.
- `to_list(cursor)`: return the whole playlist in the original order.
- `remove_current(cursor)`: remove the current song from the list. If there is a next song, it becomes the current song; otherwise the previous song does. If there is only one song, `Error(Nil)`.

`next`, `previous` and `remove_current` must be O(1). Grading measures the cost of skipping through 16,000 songs to the end and coming back to the start.

```gleam
let assert Ok(c) = from_list(["Spring", "Summer", "Autumn"])
let assert Ok(c) = next(c)           // current: "Summer", before: ["Spring"], after: ["Autumn"]
let assert Ok(c) = remove_current(c) // current: "Autumn"
to_list(c)                           // -> ["Spring", "Autumn"]
```
