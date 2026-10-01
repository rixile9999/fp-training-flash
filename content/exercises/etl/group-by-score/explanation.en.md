Each tile has to be **added** to a score group, so what you do depends on whether the score key already exists. `dict.upsert` splits exactly these two cases for you into `Some(existing list)` and `None`.

```gleam
scores
|> dict.fold(dict.new(), fn(groups, letter, score) {
  dict.upsert(groups, score, fn(existing) {
    case existing {
      Some(letters) -> [string.uppercase(letter), ..letters]
      None -> [string.uppercase(letter)]
    }
  })
})
|> dict.map_values(fn(_score, letters) { list.sort(letters, string.compare) })
```

There is a reason for splitting it into two steps. The language makes no promise about the order in which a dict is folded, so the order of the lists in the collecting step is close to accidental. That is why each group is sorted explicitly after collecting is done. The second step changes only the values, not the keys or the number of groups, so it is `dict.map_values`, a structure-preserving map ("Structure-preserving transformations: functors"). The first step is a fold that changes the shape while building up values (fold-universality).

There are two common mistakes.

- Overwriting the existing group with `dict.insert(groups, score, [letter])`, so only one tile is left per score.
- Leaving out the sort, so the dict iteration order shows up directly in the result. Appending with `list.append` in particular looks right on small inputs. That is because on the BEAM, a small dict with 32 keys or fewer happens to be iterated in key order as an implementation detail. It is not behavior the language promises. Once two-letter tiles bring the number of keys to 36, the iteration order switches to hash order, and unsorted groups are immediately scrambled.
