아래 `nucleotide_count`는 DNA 염기 서열에서 `A`, `C`, `G`, `T`의 개수를 세는 함수인데, 일부 입력에서 틀린 결과를 냅니다. 규칙에 맞게 고치세요.

- 결과는 `Ok(counts)`이고, `counts`에는 한 번도 나오지 않은 염기를 포함해 `"A"`, `"C"`, `"G"`, `"T"` 네 키가 항상 들어 있다.
- 대문자 `A`, `C`, `G`, `T`만 유효하다. 다른 글자가 하나라도 있으면 `Error(Nil)`을 반환한다.
- 빈 문자열은 유효하며, 네 염기가 모두 0개다.

지금 코드는 이렇게 동작합니다.

```gleam
nucleotide_count("GATTACA")  // -> Ok(A: 3, C: 1, G: 1, T: 2)  (맞음)
nucleotide_count("AAX")      // -> Ok(A: 2, X: 1)  (Error(Nil)이어야 함)
nucleotide_count("")         // -> Ok(빈 딕셔너리)  (네 염기가 0이어야 함)
```
