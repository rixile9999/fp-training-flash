Up to the sort, this is the same as the base exercise. What changes is the rule for assigning ranks. A student's rank cannot be decided by looking at that student alone; it depends on **the previous student's score and rank**. You cannot express that with `list.index_map`, which transforms each element independently; you need a fold that passes state from front to back (theory note "The universality of fold: the common skeleton of list recursion").

The accumulator of `list.index_fold` carries `#(previous score and rank, results so far)`.

- If the score equals the previous student's, reuse the previous rank.
- Otherwise, the rank is `position + 1`. In the sorted list, the position is "the number of students ahead of me", and tied students all have the same score and therefore sit next to each other, so this is exactly "the number of students with a higher score than me + 1".

Collect the results by prepending with `[new element, ..acc]`, then reverse once at the end.

A common mistake is to use "previous rank + 1" when a new score appears. That produces gap-free ranks such as 1, 1, 2, 3 (dense ranking), so the rank after a tie does not skip ahead by the number of tied students. Compute the rank from the position rather than from the previous rank, and this mistake cannot happen.

Translating the definition of rank directly, as in `list.count(students, fn(other) { other.score > student.score }) + 1`, is also correct, but it counts through everyone again for each student, so the work grows with the square of the number of students.
