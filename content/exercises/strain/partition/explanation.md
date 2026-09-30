결과가 두 개이므로 누적자도 두 개를 둡니다. 원소마다 조건을 한 번만 계산해 둘 중 한쪽 누적자에 쌓고, 목록이 끝나면 양쪽을 각각 뒤집어 튜플로 묶습니다.

```gleam
case items {
  [] -> #(list.reverse(kept), list.reverse(rejected))
  [first, ..rest] ->
    case predicate(first) {
      True -> go(rest, predicate, [first, ..kept], rejected)
      False -> go(rest, predicate, kept, [first, ..rejected])
    }
}
```

`keep`과 `discard`를 각각 호출해도 결과는 같지만, 목록을 두 번 훑고 조건 함수도 원소마다 두 번 부릅니다. 조건 계산이 비싸거나 목록이 크면 차이가 커집니다. 여러 결과를 한 번의 순회로 모으는 것은 결국 "상태 두 개짜리 fold"이며, 이론 노트 fold-universality(fold의 보편성)와 accumulators-and-tail-recursion(누적자와 꼬리 재귀)에서 다룹니다.

흔한 실수는 두 가지입니다.

- 한쪽 누적자만 뒤집어 다른 쪽 순서가 거꾸로 나오는 것.
- 튜플 순서를 바꿔 `#(거짓, 참)`으로 돌려주는 것. 반환 타입이 `#(List(t), List(t))`라 컴파일러가 잡아 주지 못하므로 테스트로 확인해야 합니다.
