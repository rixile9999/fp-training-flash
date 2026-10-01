On `[first, ..rest]`, `foldr` folds `rest` **first** and then combines `first` with that result. So the first element `function` is called on is the last element, and folding `"abc"` with string concatenation gives `"cba"`.

This direction is a perfect fit for `map` and `filter`. The result list is finished from the back, and each element only has to be placed **in front of** the tail that is already finished. Prepending is O(1), so the whole thing is O(n), and the order stays the same. The fact that both `map` and `filter` can be expressed as "a foldr that starts from an empty list and prepends" means that fold is the common skeleton of list recursion (`fold-universality`, `structural-recursion-induction`).

Two common mistakes:

- If you accumulate from the front with tail recursion, prepend with `[function(x), ..acc]` and do not reverse at the end, the result comes out in reverse order. If you use tail recursion, you have to reverse once at the end (`accumulators-and-tail-recursion`).
- If you append **after** the accumulated result to keep the order, as in `append(acc, [function(x)])`, the result is correct but you copy the whole accumulated list every time, which is O(n^2). With 200,000 elements it exceeds the time limit (`cost-model-immutable-structures`).

On the BEAM, even non-tail recursion like `foldr` grows its stack like a heap and does not overflow on long lists. So in this exercise, the `foldr` approach, which needs no reversing, is the simplest.
