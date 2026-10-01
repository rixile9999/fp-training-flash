A restaurant keeps its waitlist as a list of guest names, `List(String)`. The front of the list is the guest who will be seated first. Write the following four functions.

1. `add_vip(queue, name)`: put a VIP guest at the **front** of the list.
2. `add_guest(queue, name)`: put a regular guest at the **back** of the list.
3. `seat_next(queue)`: seat the guest at the front and return the rest of the list. If the list is empty, return an empty list.
4. `next_two(queue)`: return the next two guests to be seated, from the front, in order. If there are fewer than two, return only the guests there are.

```gleam
add_guest(["Minji", "Doyun"], "Hajun")
// -> ["Minji", "Doyun", "Hajun"]
next_two(["Minji"])
// -> ["Minji"]
```
