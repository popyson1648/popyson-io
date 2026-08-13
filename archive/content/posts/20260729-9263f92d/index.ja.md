+++
title = "結合度･凝集度 (TypeScript)"
date = "2026-07-29"
tags = [ "ソフトウェア設計", "TypeScript", "設計原則" ]
kana = "けつごうど･ぎょうしゅうど (TypeScript)"

[sumup]
mode = "text"
text = "ソフトウェア設計における結合度と凝集度について、それぞれの種類とTypeScriptでの具体例を挙げて解説する。"
generated = true

[thumbnail]
mode = "file"
path = "/thumbnails/20260729-9263f92d.png"
generated = true
+++

# 結合度 (coupling)

あるモジュールが他のモジュールとどれだけ結びついているか｡結合度が低いほどいいモジュール｡(変更に強いので)

- モジュール
  - パッケージ
  - クラス
  - メソッド
  
- 避ける: 内部結合
- 可能な限り避ける: 共通結合､外部結合､正業結合
- 理想的: スタンプ結合､データ結合､メッセージ結合

#### 内容結合 (Content Coupling)

あるモジュールが､別のモジュールの内部データや内部処理を直接操作｡
e.g. 別モジュールの内部データをリフレクションで変更

```ts
class Account {
  private balance = 100;
}

const account = new Account();

Reflect.set(account, "balance", 0);
```

#### 共通結合 (Common Coupling)

複数のモジュールが､同一のグローバルデータを共有｡
e.g. 複数の関数が同一のグローバル変数を変更｡

```ts
let currentUser: User | null;

function login(user: User) {
  currentUser = user;
}

function logout() {
  currentUser = null;
}
```

#### 外部結合 (External Coupling)

複数のモジュールが､外部で定められた形式やインターフェース(標準化されたインターフェースなど)に依存｡
外部ツールや外部デバイスでの通信で起こりうる｡

```ts
function impotUsers() {
  return readCsv('users.csv');
}

function exportUsers(users: User[] {
  writeCsv("users.csv", uers);
}
```


#### 制御結合 (Control Coupling)

呼び出し元が制御情報を渡し､呼び出し先の処理内容を制御する｡
e.g. booleanなどを渡して呼び出し先で分岐｡

```ts
function output(isFile: boolean, text: string) {
  if (isFile) {
    writeFile(text);
  }else{
    console.log(text);
  }
}
```

#### スタンプ結合 (Stanp Coupling)

一部のデータしか使わないのに､構造体やオブジェクトを渡している｡
e.g. `name`しか使わないのに`User`を渡している｡

```ts
function greet(user: User) {
  console.log(user.name);
}
```

#### データ結合 (Data Coupling)

処理に必要なデータだけを引数として渡す｡

```ts
function greet(name: string) {
  console.log(name);
}
```
#### メッセージ結合 (Message Coupling)

データを直接共有しない｡

```ts
logger.start();
```

### 無結合 (No Coupling)

互いも呼び出さず､データも共有しない｡

```ts
function calculateTax() {};

function formatDate() {};
```

# 凝集度 (Cohesion)

モジュール内の処理が､単一の目的に対してどの程度関連しているか｡

#### 偶発的凝集度 (Coincidental Cohesion)

関連性のない処理をが集められている｡

```ts
class Utility {
  fromatDate() {}
  calculateTax() {}
  openFile() {}
}
```

#### 論理的凝集 (Logical Cohesion)

論理的に似ている処理が集められている｡
典型パターンは､フラグなどで動作を変えたり｡

```ts
function output(type: string, text: string) {
  if (type === "console") {
    console.log(text);
  }else{
    writeFile(text);
  }
}
```

#### 時間的凝集 (Temporal Cohesion)

時間的に近くに動作する処理をまとめて実行｡
実行順序を入れ替えても動作する｡

```ts
fuction initialApp() {
  initializeLogger();
  initializeDatabase();
  initializeCache();
}
```

#### 手続き的凝集 (Procedural Coheison)

ある手続きに必要な処理を決められた順番で実行｡
共通したデータは使わない｡

```ts
function saveFile() {
  checkPermission();
  writeFile();
}
```

#### 通信的凝集 (Commumicational Cohesion)

同じ入力･出力データを扱う処理をまとめる｡

```ts
function processOrder(order: Order) {
  calculateTotal(order);
  saveOrder(order);
}
```

#### 逐次的凝集 (Sequential Cohesion)

ある部分の出力が､別の部分の入力として渡す｡

```ts
function processFile() {
  const file = readFile();
  const data = parseFile(file);
  saveData(data);
}
```

#### 機能的凝集 (Functional Cohesion)

すべての処理が単一のタスクを実現する｡

```ts
function calculateDistance(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}
```

#### 情報的凝集 (Informational Cohesion)

同じデータ構造やリソースと､それを操作する複数の機能をまとめる｡

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

良いコードとは何か - エンジニア新卒研修 スライド公開
https://speakerdeck.com/moriatsushi/liang-ikodotohahe-ka-enziniaxin-zu-yan-xiu-suraidogong-kai?slide=35
https://speakerdeck.com/moriatsushi/liang-ikodotohahe-ka-enziniaxin-zu-yan-xiu-suraidogong-kai?slide=49

津山高専「情報システム工学実験」
https://www.tsuyama-ct.ac.jp/hata/experiments/4th/software2/ja/chapter3/3_coupling.html
https://www.tsuyama-ct.ac.jp/hata/experiments/4th/software2/ja/chapter3/3_cohesion.html

