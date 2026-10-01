Implement "merge", the key step of merge sort. It takes two integer lists sorted in ascending order and returns one ascending list containing every element of both.

- The inputs `left` and `right` are each in ascending order (the same value may appear more than once).
- The result contains **every** element of both lists; equal values appear as many times as they occur.
- If one side is empty or runs out first, append the remaining elements of the other side as they are.
- Do not use `list.sort`. Don't concatenate the two lists and then sort; merge them by comparing the head elements.

```gleam
merge([1, 4, 9], [2, 3, 10])
// -> [1, 2, 3, 4, 9, 10]
```
