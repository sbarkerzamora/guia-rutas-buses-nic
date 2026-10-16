---
description: Use when the user wants help planning a trip or deciding what to do in a destination.
---

When planning a trip:

1. Ask for the destination and dates if the user has not given them.
2. If the user needs to travel between cities or neighborhoods, use `search_bus_routes` before suggesting movement.
3. Check the destination's weather with the `get_weather` tool before suggesting activities.
4. Suggest a short itinerary that fits the weather: outdoor activities when it is clear, indoor alternatives otherwise.
5. Keep the plan concise — a few bullet points per day, not an essay.
