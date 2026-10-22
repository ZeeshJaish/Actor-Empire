# Booking and occupancy diagnostic

Four seed-0 scenarios are replayed with additional observations. Every gross, receipt, cost, first/repeat admission, weekly gross, run-length and censor field matches the original 76-run matrix exactly. These four replays are not four extra independent calibration seeds. Occupancy is admissions / actual seats in booked shows, including discovery/quiet shows. A commercial pool has positive observed exhibitor contribution and at least the configured occupancy threshold; quiet pools are those with actual shows but weak observed results.

| Case | Observation | Shows | Pools with shows | Commercial pools | Quiet pools | Paid occupancy |
|---|---|---:|---:|---:|---:|---:|
| focused-small | Opening: week 1 | 2,680 | 12 | 6 | 6 | 49.4% |
| focused-small | 95% of gross: week 14 | 308 | 6 | 6 | 0 | 44.6% |
| focused-small | Final observation: week 34 | 7 | 1 | 0 | 1 | 13.2% |
| peak-release | Opening: week 1 | 77 | 11 | 11 | 0 | 93.8% |
| peak-release | 95% of gross: week 20 | 77 | 4 | 4 | 0 | 40.9% |
| peak-release | Final observation: week 34 | 7 | 1 | 0 | 1 | 12.1% |
| earned-event | Opening: week 1 | 71,739 | 1,037 | 171 | 866 | 55.6% |
| earned-event | 95% of gross: week 14 | 8,267 | 106 | 92 | 14 | 44.8% |
| earned-event | Final observation: week 44 | 7 | 1 | 0 | 1 | 13.7% |
| weak-event | Opening: week 1 | 71,739 | 1,037 | 171 | 866 | 55.6% |
| weak-event | 95% of gross: week 12 | 2,996 | 85 | 72 | 13 | 42.2% |
| weak-event | Final observation: week 37 | 7 | 1 | 0 | 1 | 13.7% |

Final global closure can occur after most booked pools are already gone. It does not imply a wide release lasted that long. The complete weekly observations are in [the JSON](booking-occupancy.json). No occupancy number is a producer revenue multiplier or a second charge.
