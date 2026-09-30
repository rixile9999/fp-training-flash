오류에 위치를 담으려면 글자를 검사하는 순간 그 글자의 위치를 알고 있어야 합니다. 그래서 먼저 `list.index_map`으로 글자마다 위치를 붙이고, 그 다음 베이스 문제와 같은 `list.try_map`으로 변환합니다.

```gleam
|> list.index_map(fn(nucleotide, position) { #(position, nucleotide) })
|> list.try_map(fn(pair) {
  let #(position, nucleotide) = pair
  complement(nucleotide)
  |> result.replace_error(InvalidNucleotide(position, nucleotide))
})
```

`complement`는 여전히 `Result(String, Nil)`을 돌려줍니다. 염기 하나의 규칙은 위치를 몰라도 되기 때문입니다. 위치 정보는 바깥에서 `result.replace_error`로 오류를 더 자세한 값으로 바꿀 때 붙입니다. 작은 함수는 단순한 오류를 내고, 문맥을 아는 쪽이 그 오류를 풍부하게 만드는 구조입니다.

"가장 앞의 오류"라는 요구는 `try_map`이 첫 `Error`에서 멈추는 성질로 저절로 충족됩니다.

흔한 실수는 두 가지입니다.

- 위치를 1부터 세는 것. `index_map`이 주는 위치는 0부터 시작하므로 그대로 쓰면 됩니다.
- `list.fold`나 `list.index_fold`로 직접 누적하면서 실패할 때마다 오류를 새로 덮어쓰는 것. 이러면 마지막 오류가 남습니다. 이미 `Error`인 누적값은 더 바꾸지 않아야 하는데, 그 규칙을 손으로 쓰다 보면 빠뜨리기 쉽습니다. `try_map`이나 `try_fold`를 쓰면 그 규칙을 직접 쓸 필요가 없습니다.

오류를 사용자 정의 타입으로 만들어 필요한 정보를 담는 방법은 이론 노트 "오류도 값이다"(errors-as-values)에서 더 다룹니다.
