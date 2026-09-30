물류 센터는 배송 목록을 우선순위 순으로 처리합니다. 같은 우선순위끼리는 **접수된 순서**(목록의 원래 순서)대로 처리해야 합니다. 어떤 타입이든 비교 함수로 정렬하는 안정 병합 정렬 `sort_by`를 구현하세요.

```gleam
pub fn sort_by(items: List(a), compare: fn(a, a) -> Order) -> List(a)
```

- `compare(x, y)`가 `Lt`면 `x`가 앞, `Gt`면 `y`가 앞에 오도록 오름차순 정렬한다.
- `compare`가 `Eq`인 원소끼리는 입력 목록에서의 순서를 그대로 유지한다(안정 정렬).
- 원소가 15만 개여도 시간 제한 안에 끝나야 한다(O(n log n)). `list.sort`는 쓰지 않는다.

```gleam
let by_priority = fn(a: Shipment, b: Shipment) { int.compare(a.priority, b.priority) }
sort_by([Shipment("A", 2), Shipment("B", 1), Shipment("C", 2), Shipment("D", 1)], by_priority)
// -> [Shipment("B", 1), Shipment("D", 1), Shipment("A", 2), Shipment("C", 2)]
```
