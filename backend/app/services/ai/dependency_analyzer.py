from typing import List, Dict, Set


class DependencyAnalyzer:
    @staticmethod
    def detect_and_prune_cycles(tasks: List[Dict]) -> List[Dict]:
        """
        Validates the dependency structure, identifies circular dependencies,
        and prunes any dependencies that create a cycle to ensure a valid DAG.
        """
        dependencies = {t["temp_id"]: list(t.get("depends_on", [])) for t in tasks}
        pruned_dependencies = {k: list(v) for k, v in dependencies.items()}
        
        def has_cycle(node: str, visited: Set[str], stack: Set[str], path: List[str]) -> bool:
            visited.add(node)
            stack.add(node)
            path.append(node)
            
            for dep in list(pruned_dependencies.get(node, [])):
                if dep not in visited:
                    if has_cycle(dep, visited, stack, path):
                        return True
                elif dep in stack:
                    # Cycle found! Prune the dependency
                    print(f"Circular dependency detected: {' -> '.join(path)} -> {dep}. Pruning relation.")
                    if dep in pruned_dependencies[node]:
                        pruned_dependencies[node].remove(dep)
                    return True
            
            stack.remove(node)
            path.pop()
            return False

        visited: Set[str] = set()
        stack: Set[str] = set()
        for task in tasks:
            temp_id = task["temp_id"]
            if temp_id not in visited:
                has_cycle(temp_id, visited, stack, [])
                
        for task in tasks:
            task["depends_on"] = pruned_dependencies.get(task["temp_id"], [])
            
        return tasks

    @staticmethod
    def topological_sort(tasks: List[Dict]) -> List[Dict]:
        """
        Sorts tasks in topological order based on their depends_on field.
        Each task dict in the list is expected to have 'temp_id' and 'depends_on'.
        """
        # Pre-validate and prune circular dependencies to ensure it's a DAG
        tasks = DependencyAnalyzer.detect_and_prune_cycles(tasks)

        # Build graph and in-degree maps
        graph: Dict[str, List[str]] = {}
        in_degree: Dict[str, int] = {}
        temp_id_to_task: Dict[str, Dict] = {}

        for task in tasks:
            temp_id = task["temp_id"]
            temp_id_to_task[temp_id] = task
            if temp_id not in graph:
                graph[temp_id] = []
            if temp_id not in in_degree:
                in_degree[temp_id] = 0

            for dep in task.get("depends_on", []):
                if dep not in graph:
                    graph[dep] = []
                graph[dep].append(temp_id)
                in_degree[temp_id] += 1

        # Queue for nodes with in-degree 0
        queue = [node for node, deg in in_degree.items() if deg == 0 and node in temp_id_to_task]
        sorted_tasks = []

        while queue:
            queue.sort()
            node = queue.pop(0)
            sorted_tasks.append(temp_id_to_task[node])

            for neighbor in graph.get(node, []):
                if neighbor in in_degree:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0 and neighbor in temp_id_to_task:
                        queue.append(neighbor)

        # Append remaining tasks to prevent crash if any corner cases exist
        scheduled_temp_ids = {t["temp_id"] for t in sorted_tasks}
        for task in tasks:
            if task["temp_id"] not in scheduled_temp_ids:
                sorted_tasks.append(task)

        return sorted_tasks
