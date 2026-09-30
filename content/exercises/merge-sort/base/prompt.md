정수 목록을 오름차순으로 정렬하는 병합 정렬을 세 함수로 나눠 구현하세요. 테스트는 세 함수를 각각 호출합니다.

- `split(items: List(Int)) -> #(List(Int), List(Int))`: 앞쪽 `length / 2`개(정수 나눗셈)와 나머지로 나눈다. 원소 순서는 그대로 둔다.
- `merge(left: List(Int), right: List(Int)) -> List(Int)`: 오름차순인 두 목록을 오름차순 목록 하나로 합친다. 같은 값은 개수만큼 모두 남긴다.
- `sort(items: List(Int)) -> List(Int)`: `split`으로 나누고, 각 절반을 재귀로 정렬하고, `merge`로 합친다.
- 원소가 15만 개여도 시간 제한 안에 끝나야 한다(O(n log n)). `list.sort`는 쓰지 않는다. `list.length`, `list.split`은 써도 된다.

```gleam
split([5, 1, 4])           // -> #([5], [1, 4])
merge([1, 5], [2, 4])      // -> [1, 2, 4, 5]
sort([5, 2, 9, 1, 5, 6])   // -> [1, 2, 5, 5, 6, 9]
```
