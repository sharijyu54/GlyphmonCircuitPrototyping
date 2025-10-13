# 🔷 Glyphmon 回路魔法システム — Signal仕様書（v1.0 / Element × Number）

---

## 🧩 概要

**Signal（信号）**は、Glyphmon世界における「魔法エネルギーの最小単位」。  
バトル中、プレイヤーや敵の行動によって生成され、  
回路盤（Circuit Board）上をTickごとに上方向へ進行する。  

進行中のSignalは盤上の記号（Glyph Block）と相互作用し、  
最終的に **Output Lane** に到達することで効果を発揮する。  

---

## ⚙️ Signal基本仕様

| 項目 | 内容 |
|------|------|
| 名称 | Signal（信号） |
| 用途 | 回路上のエネルギー単位。攻撃／回復／バフ／干渉の起点となる |
| 発生トリガ | ・敵攻撃の無効化成功<br>・アイテム拾得<br>・特定スキル使用 |
| 消滅条件 | ・Lifetime経過<br>・盤面外到達（Output後）<br>・干渉（Cancel）発生時 |
| 更新周期 | 1 Tick／0.2〜0.5秒（ゲーム速度調整可能） |
| 可視化単位 | 盤面マス1セルにつきSignal 1個 |

---

## 🔢 Signalの主要プロパティ

| プロパティ名 | 型 | 概要 | 表示・表現方法 |
|---------------|----|------|----------------|
| `Element` | Enum (`EElementType`) | 信号の属性。世界の三すくみを構成する。<br>🔥 Heat（攻撃・破壊）<br>💧 Core（制御・精神）<br>🌿 Integrity（防御・再生） | **色**で表現（Red / Blue / Green） |
| `Number` | int32（1〜9） | 信号に付与された整数値。回路内での並び順・役形成に利用される。 | **中央の数字表示**または**Glyph形状変化** |

---

## 🎮 属性（Element）の相性関係

| 属性 | 有利 | 不利 | 効果例 |
|------|------|------|--------|
| 🔥 Heat | 🌿 Integrity | 💧 Core | 攻撃特化。木を焼くが水に弱い。 |
| 💧 Core | 🔥 Heat | 🌿 Integrity | 精神系。火を制御し、木に吸収される。 |
| 🌿 Integrity | 💧 Core | 🔥 Heat | 生命系。水を吸い、火に燃やされる。 |

- **同属性同士の接触** → Amplify（共鳴・威力上昇）  
- **有利属性 vs 不利属性** → Overload（倍加ダメージ）  
- **不利属性 vs 有利属性** → Cancel（消滅）

---

## 🃏 数値（Number）の役割

- `Number` は **1〜9** の整数値で、信号生成時に付与される。  
- 盤上で連続したNumberパターンを形成すると「役（Hand）」が発動する。  
- 役の成立はOutput時に自動評価され、発動倍率を決定。

| 役名 | 条件 | 効果例 |
|------|------|--------|
| **Pair** | 同じNumberが2連 | 威力+25% |
| **Triple** | 同じNumberが3連 | 威力+50%、追加効果発生 |
| **Straight** | 連番（例：3→4→5） | 属性融合（複合効果） |
| **Full Circuit** | 属性3種＋連番 | 倍率×2、特殊演出 |

---

## 🧠 Signalの進行・干渉ロジック（概要）

```pseudo
for each Tick:
    for each Signal in Board:
        Signal.Advance(Direction.Up)

        if Signal.CollidesWith(OtherSignal):
            if Signal.Element == OtherSignal.Element:
                Amplify()
            else if Signal.Element is strong_against OtherSignal.Element:
                Overload()
            else:
                Cancel()
