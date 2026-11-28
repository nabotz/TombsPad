---
inclusion: fileMatch
fileMatchPattern: "src/render/**"
---
# Render area steering

- Three.js scene uses OrthographicCamera looking down the Y-axis.
- Grid is 16×16 PlaneGeometry meshes with MeshBasicMaterial.
- Raycasting uses Pointer Events (not mouse events) for mobile compatibility.
- Cell color updates must call renderer.render() after mesh material changes.
- getCellColor is exported at module level (not inside initCanvas) so Scheduler can read cell state.
- Owner: sendori
