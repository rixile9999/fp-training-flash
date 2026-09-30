# First-version content plan

Target: 42 families (30 core + 12 algorithm), each with a `base` variant and at least two more variants
(different context, edge conditions, or kind). Every variant has tests, a reference solution, at least one
wrong answer (implement/fix), five hints and an explanation. Exercism-derived families keep attribution.
Family ids below are fixed; authors may adjust titles.

## Core track

### data-transformation (order 1)

| family id | source | idea |
|---|---|---|
| orders-apply-coupon | original | change some items, keep the rest (map + case, record update) |
| tracks-on-tracks | exercism concept `tracks-on-tracks-on-tracks` | list basics |
| accumulate | exercism `accumulate` | write map by hand |
| strain | exercism `strain` | keep / discard |
| etl | exercism `etl` | dict re-keying |
| word-count | exercism `word-count` | normalise, split, count into a dict |
| nucleotide-count | exercism `nucleotide-count` | fold into a dict, reject invalid input |
| inventory-restock | original | nested record update inside a list |
| log-level-summary | original | group and count log lines with fold |
| gradebook-ranking | original | sort, rank with index, ties |

### explicit-failure (order 2)

| family id | source | idea |
|---|---|---|
| role-playing-game | exercism concept `role-playing-game` | Option basics |
| go-results | exercism concept `go` | Result basics |
| rna-transcription | exercism `rna-transcription` | Result over a traversal |
| phone-number | exercism `phone-number` | validation errors as a custom type |
| isbn-verifier | exercism `isbn-verifier` | total validation |
| all-your-base | exercism `all-your-base` | several error cases |
| parse-order-line | original | string to record with a custom error type, `use` chaining |
| config-lookup | original | Option/Result chaining over dicts |
| signup-validation | original | first error vs collecting all errors |
| replace-let-assert | original, kind fix | turn crashing code into Result |

### function-decomposition (order 3)

| family id | source | idea |
|---|---|---|
| high-school-sweetheart | exercism concept `high-school-sweetheart` | pipe operator |
| secrets | exercism concept `secrets` | higher-order functions, closures |
| invoice-total-refactor | original, kind refactor | split a long function into named steps |
| pricing-effects-split | original, kind refactor | move printing/logging out of calculation |
| text-normalizer-pipeline | original | compose small string functions |
| report-builder | original | parse, aggregate, format as separate functions |
| discount-rules | original | list of rule functions applied in order |
| account-event-fold | original | state as a fold over events (pure state transition) |
| pipeline-predict | original, kind predict | predict pipeline results |
| tournament | exercism `tournament`, format challenge | multi-step program |

## Algorithm track

| skill | family id | source | idea |
|---|---|---|---|
| recursive-algorithms | list-ops | exercism `list-ops` | fold/append/reverse by hand, O(n) |
| recursive-algorithms | merge-sort | original | split, merge, O(n log n) |
| recursive-algorithms | binary-search-tree | exercism `binary-search-tree` | insert and in-order traversal |
| dynamic-programming | change | exercism `change` | fewest coins |
| dynamic-programming | knapsack | exercism `knapsack` | 0/1 knapsack with a dict table |
| dynamic-programming | edit-distance | original | Levenshtein distance |
| search-and-graphs | dominoes | exercism `dominoes` | backtracking chain |
| search-and-graphs | n-queens-count | original | backtracking count |
| search-and-graphs | maze-shortest-path | original | BFS on a grid with an immutable queue |
| functional-data-structures | two-list-queue | original | amortised O(1) queue |
| functional-data-structures | leftist-heap | original | persistent priority queue |
| functional-data-structures | zipper | exercism `zipper` | tree zipper |

Algorithm variants use `performance` where a naive solution is asymptotically worse (for example O(n^2)
append in list-ops, exponential recursion in change/edit-distance, list-based queue in maze-shortest-path).

## Theory topics (19)

| id | level | skills |
|---|---|---|
| functor-structure-preservation | basic | data-transformation |
| fold-universality | advanced | data-transformation, recursive-algorithms |
| structural-recursion-induction | basic | data-transformation, recursive-algorithms |
| immutability-structural-sharing | basic | data-transformation, functional-data-structures |
| algebraic-data-types | basic | data-transformation, explicit-failure |
| total-vs-partial-functions | basic | explicit-failure |
| errors-as-values | basic | explicit-failure |
| chaining-results-monads | advanced | explicit-failure |
| referential-transparency | basic | function-decomposition |
| function-composition-pipelines | basic | function-decomposition |
| higher-order-modularity | advanced | function-decomposition |
| separating-effects | basic | function-decomposition |
| accumulators-and-tail-recursion | basic | recursive-algorithms |
| cost-model-immutable-structures | basic | all algorithm skills |
| divide-and-conquer | basic | recursive-algorithms |
| dynamic-programming-subproblems | basic | dynamic-programming |
| search-space-backtracking | basic | search-and-graphs |
| amortized-analysis | advanced | functional-data-structures |
| persistent-data-structures | advanced | functional-data-structures |

## Concept notes (Gleam)

gleam-list-transform, gleam-record-update, gleam-case-patterns, gleam-pipe-operator, gleam-anonymous-functions,
gleam-option-result, gleam-use-expressions, gleam-dict-set, gleam-recursion, gleam-strings, gleam-custom-types,
gleam-int-float, gleam-let-assert-panic, gleam-sorting-order. Exercism concept `about.md` files may be adapted
with attribution.

## Citations

Further-reading entries start with `verified: false`. A human must check bibliographic data before setting
`verified: true`.
