The waitlist is a linked list, so adding to the front with `[name, ..queue]` finishes immediately, while adding to the back with `list.append(queue, [name])` walks the whole list and builds it anew. The heart of the requirement is that these two operations give results in a different order. If you add a regular guest with `[name, ..queue]`, they cut in line.

`seat_next` and `next_two` split on the shape of the list.

```gleam
case queue {
  [first, second, ..] -> [first, second]
  short -> short
}
```

With two or more guests, return the first two; if the list is shorter (empty or one guest), return the list itself unchanged. A common mistake is writing the last branch as `_ -> []`, which loses the guest when only one is waiting. `list.take(queue, 2)` and `list.drop(queue, 1)` follow the same rules, so feel free to use them.

Handling a list through its two shapes, the empty list and "one element + the rest", is covered in the theory note structural-recursion-induction (structural recursion and induction).
