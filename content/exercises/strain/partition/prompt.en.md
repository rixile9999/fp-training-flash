Write `partition(items, predicate)`, which takes a list and a condition function and splits the list into the elements that satisfy the condition and those that don't.

- The return value is the tuple `#(elements where the condition is True, elements where the condition is False)`.
- Both lists keep the original order. If a value appears several times, keep every copy.
- Walk the list **only once**. Don't traverse it twice, as you would by calling `keep` and `discard` separately.
- Do not use `list.filter` or `list.partition`.

```gleam
partition([1, 2, 3, 4, 5], int.is_even)
// -> #([2, 4], [1, 3, 5])
```
