/**
 * Represents a single TODO item in the list
 */
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

/**
 * The root document structure stored in Automerge
 */
export interface TodoDoc {
  todos: Todo[];
}
