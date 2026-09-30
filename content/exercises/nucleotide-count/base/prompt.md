DNA 염기 서열을 문자열로 받아, 네 염기 `A`, `C`, `G`, `T`가 각각 몇 개인지 세어 딕셔너리로 반환하세요.

- 결과는 `Ok(counts)`이고, `counts`에는 한 번도 나오지 않은 염기를 포함해 `"A"`, `"C"`, `"G"`, `"T"` 네 키가 항상 들어 있다.
- 대문자 `A`, `C`, `G`, `T`만 유효한 글자다. 소문자나 다른 글자가 하나라도 있으면 `Error(Nil)`을 반환한다.
- 빈 문자열은 유효하며, 네 염기가 모두 0개다.

```gleam
nucleotide_count("GATTACA")
// -> Ok(dict.from_list([#("A", 3), #("C", 1), #("G", 1), #("T", 2)]))

nucleotide_count("GATXACA")
// -> Error(Nil)
```
