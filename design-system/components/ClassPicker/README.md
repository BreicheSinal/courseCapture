ClassPicker chooses the classes a course is assigned to, each with its own due date.

Render a `ul.cc-classpick`. Each `li.cc-classpick__row` holds a Checkbox (the class name, with its section and student count as the hint) and a DateInput in `cc-classpick__date`, labelled for that class ("Due date for Biology 10"). Put it in a Modal when it's the whole task.

- **Date per class.** The date is on only while its class is ticked; an unticked class sends no date.
- **Why a list.** Teachers have a handful of classes and every chosen class needs its own date, which a combobox can't hold.
- **Button.** Name the result: "Assign to Biology 10", or "Assign to 2 classes".
- **No classes.** Show an EmptyState with "Create class".
- **Phones.** The date wraps under the name.
