+++
title = "Coupling & Cohesion (TypeScript)"
date = "2026-07-29"
tags = [ "software design", "TypeScript", "design principles" ]
kana = ""

[sumup]
mode = "text"
text = "An explanation of coupling and cohesion in software design, covering each type with concrete TypeScript examples."
generated = true

[thumbnail]
mode = "file"
path = "/thumbnails/20260729-9263f92d.png"
generated = true
+++

# Coupling

How tightly a module is bound to other modules. Lower coupling makes for a better module (it is more resilient to change).

- Module
  - Package
  - Class
  - Method
  
- Avoid: Content Coupling
- Avoid if possible: Common Coupling, External Coupling, Control Coupling
- Ideal: Stamp Coupling, Data Coupling, Message Coupling

#### Content Coupling

A module directly manipulates the internal data or internal processing of another module.
e.g. Modifying another module's internal data via reflection.

```ts
class Account {
  private balance = 100;
}

const account = new Account();

Reflect.set(account, "balance", 0);
```

#### Common Coupling

Multiple modules share the same global data.
e.g. Multiple functions modify the same global variable.

```ts
let currentUser: User | null;

function login(user: User) {
  currentUser = user;
}

function logout() {
  currentUser = null;
}
```

#### External Coupling

Multiple modules depend on a format or interface defined externally (such as a standardized interface).
This can occur in communication with external tools or devices.

```ts
function impotUsers() {
  return readCsv('users.csv');
}

function exportUsers(users: User[] {
  writeCsv("users.csv", uers);
}
```


#### Control Coupling

The caller passes control information to dictate what the callee does.
e.g. Passing a boolean and branching on it inside the callee.

```ts
function output(isFile: boolean, text: string) {
  if (isFile) {
    writeFile(text);
  }else{
    console.log(text);
  }
}
```

#### Stamp Coupling

An object or struct is passed even though only part of its data is used.
e.g. A `User` is passed when only `name` is needed.

```ts
function greet(user: User) {
  console.log(user.name);
}
```

#### Data Coupling

Only the data needed for processing is passed as arguments.

```ts
function greet(name: string) {
  console.log(name);
}
```
#### Message Coupling

No data is shared directly.

```ts
logger.start();
```

### No Coupling

Neither calls the other, and no data is shared.

```ts
function calculateTax() {};

function formatDate() {};
```

# Cohesion

How closely the processing within a module is related to a single purpose.

#### Coincidental Cohesion

Unrelated processing is grouped together.

```ts
class Utility {
  fromatDate() {}
  calculateTax() {}
  openFile() {}
}
```

#### Logical Cohesion

Logically similar processing is grouped together.
A typical pattern is using a flag or similar value to switch behavior.

```ts
function output(type: string, text: string) {
  if (type === "console") {
    console.log(text);
  }else{
    writeFile(text);
  }
}
```

#### Temporal Cohesion

Processing that runs at roughly the same time is executed together.
The order of execution can be changed without affecting behavior.

```ts
fuction initialApp() {
  initializeLogger();
  initializeDatabase();
  initializeCache();
}
```

#### Procedural Cohesion

The processing required for a procedure is executed in a fixed order.
No shared data is used.

```ts
function saveFile() {
  checkPermission();
  writeFile();
}
```

#### Communicational Cohesion

Processing that operates on the same input/output data is grouped together.

```ts
function processOrder(order: Order) {
  calculateTotal(order);
  saveOrder(order);
}
```

#### Sequential Cohesion

The output of one part is passed as the input to another.

```ts
function processFile() {
  const file = readFile();
  const data = parseFile(file);
  saveData(data);
}
```

#### Functional Cohesion

All processing serves to accomplish a single task.

```ts
function calculateDistance(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}
```

#### Informational Cohesion

Multiple functions that operate on the same data structure or resource are grouped together.

```ts
class Stack<T> {
  private items: T[] = {};
  
  push(item: T) {
    this.items.push(item);
  }
  
  pop() {
    return this.items.pop();
  }
}
```

ref.

What Is Good Code — New Engineer Training Slides (Public)
https://speakerdeck.com/moriatsushi/liang-ikodotohahe-ka-enziniaxin-zu-yan-xiu-suraidogong-kai?slide=35
https://speakerdeck.com/moriatsushi/liang-ikodotohahe-ka-enziniaxin-zu-yan-xiu-suraidogong-kai?slide=49

Tsuyama National College of Technology — Information Systems Engineering Lab
https://www.tsuyama-ct.ac.jp/hata/experiments/4th/software2/ja/chapter3/3_coupling.html
https://www.tsuyama-ct.ac.jp/hata/experiments/4th/software2/ja/chapter3/3_cohesion.html
