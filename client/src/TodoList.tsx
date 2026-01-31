import { useState, useCallback, FormEvent, KeyboardEvent } from "react";
import { next as Automerge } from "@automerge/automerge";
import { Todo, TodoDoc } from "./types";

interface TodoListProps {
  doc: TodoDoc;
  changeDoc: (changeFn: (doc: TodoDoc) => void) => void;
}

function TodoList({ doc, changeDoc }: TodoListProps) {
  const [newTodoText, setNewTodoText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Add a new todo
  const addTodo = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = newTodoText.trim();
      if (!text) return;

      changeDoc((d) => {
        d.todos.push({
          id: crypto.randomUUID(),
          text,
          completed: false,
          createdAt: Date.now(),
        });
      });

      setNewTodoText("");
    },
    [newTodoText, changeDoc]
  );

  // Toggle todo completion
  const toggleTodo = useCallback(
    (id: string) => {
      changeDoc((d) => {
        const todo = d.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
        }
      });
    },
    [changeDoc]
  );

  // Delete a todo
  const deleteTodo = useCallback(
    (id: string) => {
      changeDoc((d) => {
        const index = d.todos.findIndex((t) => t.id === id);
        if (index !== -1) {
          d.todos.splice(index, 1);
        }
      });
    },
    [changeDoc]
  );

  // Start editing a todo
  const startEditing = useCallback((todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  }, []);

  // Save edited todo using updateText for character-level CRDT merging
  const saveEdit = useCallback(
    (id: string) => {
      const text = editText.trim();
      if (!text) {
        // If empty, delete the todo
        deleteTodo(id);
      } else {
        changeDoc((d) => {
          const index = d.todos.findIndex((t) => t.id === id);
          if (index !== -1) {
            // Use updateText for character-by-character CRDT merging
            // This allows concurrent edits to different parts of the text to be merged
            Automerge.updateText(d, ["todos", index, "text"], text);
          }
        });
      }
      setEditingId(null);
      setEditText("");
    },
    [editText, changeDoc, deleteTodo]
  );

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);

  // Handle keyboard events in edit mode
  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent, id: string) => {
      if (e.key === "Enter") {
        saveEdit(id);
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  // Calculate stats
  const totalTodos = doc.todos.length;
  const completedTodos = doc.todos.filter((t) => t.completed).length;
  const activeTodos = totalTodos - completedTodos;

  return (
    <div className="todo-list">
      {/* Add new todo form */}
      <form className="add-todo-form" onSubmit={addTodo}>
        <input
          type="text"
          className="todo-input"
          placeholder="What needs to be done?"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          autoFocus
        />
        <button type="submit" className="add-button" disabled={!newTodoText.trim()}>
          Add
        </button>
      </form>

      {/* Todo items */}
      {totalTodos === 0 ? (
        <div className="empty-state">
          <p>No todos yet. Add one above!</p>
        </div>
      ) : (
        <ul className="todos">
          {doc.todos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? "completed" : ""}`}
            >
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />

              {editingId === todo.id ? (
                <input
                  type="text"
                  className="todo-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => saveEdit(todo.id)}
                  onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                  autoFocus
                />
              ) : (
                <span
                  className="todo-text"
                  onDoubleClick={() => startEditing(todo)}
                  title="Double-click to edit"
                >
                  {todo.text}
                </span>
              )}

              <div className="todo-actions">
                <button
                  className="edit-button"
                  onClick={() => startEditing(todo)}
                  aria-label="Edit todo"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  className="delete-button"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label="Delete todo"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Stats footer */}
      {totalTodos > 0 && (
        <div className="todo-stats">
          <span>{activeTodos} item{activeTodos !== 1 ? "s" : ""} left</span>
          <span>{completedTodos} completed</span>
        </div>
      )}

      {/* Conflict demo hint */}
      <div className="conflict-hint">
        <strong>Try this:</strong> Open in two tabs and edit the same item. Automerge 
        uses character-level CRDTs, so edits to different parts of the text will be 
        merged together!
      </div>
    </div>
  );
}

export default TodoList;
