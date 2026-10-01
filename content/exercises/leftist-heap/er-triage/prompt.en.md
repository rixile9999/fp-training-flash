An emergency room manages its waiting queue with a leftist heap. Each patient has a name, a severity (`severity`, higher is more urgent) and an arrival number (`arrival`, lower means arrived earlier).

```gleam
pub type Patient {
  Patient(name: String, severity: Int, arrival: Int)
}
```

Treatment rule: the patient with higher severity goes first. With equal severity, the patient who arrived first goes first. Every patient has a different arrival number.

The heap type `Queue` and `rank`, `make` (builds a node with the higher-rank child on the left), `add` and `next` are already provided. Implement the following three functions.

- `goes_first(a, b)`: `True` if, by the rule, `a` must be treated before `b`.
- `merge(a, b)`: a leftist heap combining the two queues. The root holds the patient to be treated first according to `goes_first`. Build nodes with `make`.
- `treatment_order(patients)`: put every patient into the queue, then return the list of names in treatment order.

```gleam
treatment_order([Patient("Kim", 2, 1), Patient("Lee", 5, 2), Patient("Park", 5, 3)])
// -> ["Lee", "Park", "Kim"]   Lee and Park have the same severity, so Lee, who arrived first, goes ahead
```
