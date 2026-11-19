# PRD: Apply Localize — จับคู่และผูก String Variable กับ Text Layer (PRD-ID: PRD--001)

- เวอร์ชัน: 1.0
- สถานะ: Draft
- Owner: [TO CONFIRM]
- อัปเดตล่าสุด: 2026-11-19

## 1. Product Context

Apply Localize เป็น Figma plugin สำหรับค้นหา text layer ที่ยังไม่มี binding กับ local string variable หรือมี binding เดิมที่อ้างถึง variable ซึ่งหาไม่พบ แล้วช่วยผู้ใช้เลือก variable และ apply binding ให้ทีละรายการหรือหลายรายการ

### ขอบเขตหลักฐาน

- `manifest.json`: ระบุชื่อและ ID ของ Figma plugin, ใช้ `ui.html` เป็น UI และกำหนด `code.js` เป็น entry point; ไฟล์ `code.js` ยังไม่มีใน repo นี้
- `code.ts`: สแกนหน้าและ local string variables, จับคู่ candidate, เลือก layer บน canvas และกำหนด binding
- `ui.html`: หน้าค้นหาและกรองผล, เลือก variable/layer และแสดงสถานะกับความคืบหน้า
- `AGENTS.md`: กำหนดให้ frontend ปฏิบัติตาม A11Y.md และใช้ WCAG 2.1 ระดับ AA เป็นค่าเริ่มต้น
- `CLAUDE.md`: ชี้ไปยัง `AGENTS.md`; `.claude/settings.local.json` ปิด MCP server ชื่อ `open-knowledge` เป็นการตั้งค่าท้องถิ่น ไม่ใช่ความสามารถของผลิตภัณฑ์

## 2. Problem Statement

โค้ดปัจจุบันแสดงให้เห็นว่าผู้ใช้ต้องตรวจหา text layer ที่ยังไม่ผูก variable และเลือก binding ให้ตรงกับ string variable ในไฟล์ Figma ด้วยตนเอง การจับคู่จากชื่ออาจมีหลาย candidate หรือไม่มี candidate จึงต้องตรวจข้อความและ collection ก่อน apply

เป้าหมายในการลดงานตรวจและผูก binding เป็นข้อสรุปจากความสามารถในโค้ด `[DRAFT]`; ยังไม่มีข้อมูลผู้ใช้หรือหลักฐานเชิงธุรกิจใน repo

## 3. Goals & Non-goals

### Goals

- ช่วยค้นหาและตรวจสอบ text layer ที่อาจต้องผูก local string variable
- เสนอ candidate จากชื่อ layer หรือชื่อ variable เดิม และให้ผู้ใช้ยืนยันก่อน apply ในกรณีมีหลายตัวเลือก
- รองรับการ apply ทีละรายการและหลายรายการ พร้อมแจ้งผลและสแกนซ้ำ

### Non-goals

- สร้างหรือแปลข้อความ หรือแก้เนื้อหาของ text layer
- สร้าง แก้ไข หรือลบ variables/collections
- จับคู่แบบ fuzzy, semantic หรือข้ามไฟล์/ทีม
- รองรับ remote variables ตามหลักฐานในโค้ดปัจจุบัน ซึ่งดึงเฉพาะ local variables

## 4. Target Users / Personas

- Persona 1 — นักออกแบบหรือผู้ดูแลไฟล์ Figma ที่ใช้ string variables `[DRAFT]`: ต้องการค้นหา text layer ที่ยังไม่ผูกและตรวจ candidate ได้จากข้อความกับตำแหน่งในไฟล์
- Persona 2 — ผู้ดูแล localization/design system `[DRAFT]`: ต้องการจัดการ binding หลายรายการโดยเลือก collection และ variable ได้อย่างแม่นยำ

## 5. Use Cases / Jobs To Be Done

- UC-001: ในฐานะผู้ใช้ปลั๊กอิน ฉันต้องการสแกนทุก page เพื่อหารายการที่อาจต้องผูก string variable
- UC-002: ฉันต้องการค้นหา กรอง และดูตำแหน่ง/ข้อความของ layer เพื่อทบทวน candidate
- UC-003: ฉันต้องการเลือก variable และไปยัง layer บน canvas ก่อนตัดสินใจ apply
- UC-004: ฉันต้องการ apply binding ทีละรายการหรือหลายรายการ และทราบผลลัพธ์

## 6. Assumptions / Constraints / Dependencies

- ปลั๊กอินทำงานใน Figma และใช้ Figma Plugin API สำหรับ document, variables, fonts, selection และ viewport
- การสแกนอ่าน local `STRING` variables และ collections; candidate ต้องมีชื่อเท่ากับชื่อที่ใช้จับคู่แบบตรงตัว
- เมื่อพบ binding เดิมที่ resolve ไม่ได้ ระบบใช้ชื่อ variable เดิมเป็นชื่อที่คาดหวัง และพยายามให้น้ำหนักกับ collection ชื่อเดิม หากไม่พบ candidate ใน collection นั้นจะพิจารณา candidate ชื่อเดียวกันจาก collection อื่น
- การ apply ต้องโหลดฟอนต์ของ text layer ก่อนกำหนด binding
- repo ไม่มี package/build/test configuration, automated tests หรือข้อมูลประวัติ Git ที่ใช้ยืนยันคำสั่งและมาตรฐานเพิ่มเติม

## 7. Functional Requirements

### FR--001: สแกนและจำแนก text layer

- คำอธิบาย: สแกนทุก page ที่โหลดได้และตรวจ text layer; ข้าม layer ที่ผูกกับ local variable แล้ว; แสดงรายการที่ไม่มี binding หรือมี binding เดิมซึ่งไม่พบในไฟล์ พร้อมนับรายการที่จับคู่ไม่ได้
- Use cases ที่เกี่ยวข้อง: UC-001
- Problems ที่เกี่ยวข้อง: ต้องค้นหาและตรวจสถานะ binding ในเอกสาร
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: เปิดปลั๊กอินหรือกดสแกนใหม่
- ผลลัพธ์ที่คาดหวัง: รายการ candidate, ความคืบหน้าราย page และจำนวน layer ที่จับคู่ไม่ได้

### FR--002: เสนอ candidate จากชื่อและ collection

- คำอธิบาย: ถ้าไม่มี binding เดิม ให้เทียบชื่อ text layer กับชื่อ local string variable; ถ้ามี binding เดิมที่ resolve ไม่ได้ ให้ใช้ชื่อ variable เดิม หากมีหลาย candidate ให้แสดง collection, ชื่อ variable และ preview ค่าจาก default mode
- Use cases ที่เกี่ยวข้อง: UC-001, UC-003
- Problems ที่เกี่ยวข้อง: ชื่อซ้ำหรือ collection หลายชุดทำให้เลือกผิดได้
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: ผลจากการสแกนและข้อมูล variables/collections ในไฟล์
- ผลลัพธ์ที่คาดหวัง: ผู้ใช้เห็นตัวเลือกที่ตรงชื่อและเลือกตัวที่ต้องการได้

### FR--003: ค้นหาและกรองรายการ

- คำอธิบาย: ค้นหาจากชื่อ layer, preview ข้อความ หรือ path; กรองตาม collection; จัดกลุ่มผลตาม page
- Use cases ที่เกี่ยวข้อง: UC-002
- Problems ที่เกี่ยวข้อง: ต้องตรวจรายการในเอกสารขนาดใหญ่ได้สะดวก
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: พิมพ์คำค้นหรือเปลี่ยน collection filter
- ผลลัพธ์ที่คาดหวัง: รายการที่มองเห็นอัปเดตตามตัวกรอง

### FR--004: ตรวจ layer และเลือกการทำงาน

- คำอธิบาย: แสดงชื่อ, path, preview, เหตุผลที่แสดงรายการ และค่าของ candidate; ไปยัง page, เลือก และ zoom layer ใน canvas ได้; candidate เดียวถูกเลือกอัตโนมัติ ส่วนหลาย candidate ต้องให้ผู้ใช้เลือกก่อนจึงเลือก apply ได้
- Use cases ที่เกี่ยวข้อง: UC-002, UC-003
- Problems ที่เกี่ยวข้อง: ต้องตรวจบริบทและลดการเลือก variable ผิด
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: คลิกชื่อ/ปุ่มไปที่ layer, เลือก variable หรือ checkbox
- ผลลัพธ์ที่คาดหวัง: ผู้ใช้ตรวจตำแหน่งและกำหนดรายการที่จะ apply ได้

### FR--005: Apply binding ทีละรายการ

- คำอธิบาย: ตรวจว่า node ยังเป็น text layer และ variable ยังเป็นชนิด `STRING`; โหลดฟอนต์ที่ใช้อยู่ก่อนกำหนด binding ให้ `characters`; แจ้งผลสำเร็จหรือข้อผิดพลาด
- Use cases ที่เกี่ยวข้อง: UC-003, UC-004
- Problems ที่เกี่ยวข้อง: การ apply อาจทำไม่ได้เมื่อ node หรือ variable เปลี่ยน/หายไป
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: กด Apply บนรายการที่มี variable ที่เลือก
- ผลลัพธ์ที่คาดหวัง: binding ถูกกำหนด หรือผู้ใช้ได้รับข้อความผลลัพธ์

### FR--006: Apply หลายรายการและสแกนซ้ำ

- คำอธิบาย: Apply เฉพาะรายการที่มองเห็นและถูกเลือก แสดงจำนวนที่สำเร็จ/ไม่สำเร็จและความคืบหน้า จากนั้นสแกนเอกสารใหม่
- Use cases ที่เกี่ยวข้อง: UC-004
- Problems ที่เกี่ยวข้อง: การผูกทีละรายการมีขั้นตอนซ้ำเมื่อมีหลาย layer
- ผู้ใช้งานหลัก / actor หลัก: ผู้ใช้ปลั๊กอิน
- Triggers / inputs: กด Apply พร้อมรายการที่เลือก
- ผลลัพธ์ที่คาดหวัง: แสดงผลรวมและรายการปัจจุบันหลังสแกนซ้ำ

## 8. Non-functional Requirements

- Performance: แสดงความคืบหน้าระหว่างโหลดและสแกนแต่ละ page; ไม่มีเป้าหมายเวลา/ขนาดไฟล์ระบุใน repo `[DRAFT]`
- Reliability: จัดการ scan error, node/variable ที่หาไม่พบ และผลสำเร็จ/ล้มเหลวของ apply; bulk apply ดำเนินรายการต่อและสรุปจำนวน
- Security / privacy: source ที่ตรวจใช้ Figma API และไม่มีการเรียกเครือข่ายภายนอก; ไม่กำหนดการเก็บหรือส่งข้อมูลใน repo
- UX / accessibility: งาน frontend ต้องสอดคล้องกับ WCAG 2.1 AA ตาม `AGENTS.md`; UI ปัจจุบันมีป้ายกำกับสำหรับค้นหา/ตัวกรอง, live status, focus outline และรองรับ reduced motion แต่ยังไม่มีหลักฐานว่าผ่านการตรวจ AA

## 9. Business Rules

- BR--001: ใช้ local variables ที่มีชนิด `STRING` เป็น candidate
- BR--002: ชื่อ candidate ต้องตรงกับชื่อที่คาดหวังแบบ exact match; ระบบไม่มี fuzzy matching
- BR--003: หาก binding เดิม resolve เป็น local variable ได้ ให้ข้าม layer นั้น
- BR--004: หากชื่อเดิมตรงกับ candidate ใน collection เดิม ให้ใช้ candidate กลุ่มนั้น; หากไม่ตรงจึง fallback ไปยัง candidate ชื่อเดียวกันจาก collection อื่น
- BR--005: Apply all ครอบคลุมเฉพาะรายการที่แสดงตาม search/filter และถูกเลือก; แถวที่มี candidate เดียวถูกเลือกโดยอัตโนมัติ
- BR--006: การ apply ผูก variable กับ `characters`; ไม่แก้ข้อความ layer

## 10. User Flows (High-level)

- FLOW--001: เปิดปลั๊กอิน → สแกนทุก page → ทบทวนผล → ค้นหา/กรอง → เลือก candidate และรายการ → apply ทีละรายการหรือเป็นชุด → ดูผลและสแกนซ้ำ
- FLOW--002: พบหลาย candidate → ไปยัง layer บน canvasและตรวจข้อความ/collection → เลือก variable → apply → ตรวจสถานะผลลัพธ์

## 11. Edge Cases & Error Scenarios

- ไม่มี local string variable ที่ชื่อจับคู่ได้: ไม่นำ layer เข้า candidate list และนับเป็น unresolved
- มี candidate หลายตัว: ต้องเลือก variable ก่อนจึง apply ได้
- node หรือ variable ถูกลบ/เปลี่ยนระหว่างสแกนกับ apply: แสดงข้อผิดพลาดสำหรับรายการนั้น
- โหลด page, font หรือสแกนล้มเหลว: แจ้งสถานะผิดพลาด; รายละเอียดการกู้คืน/ลองใหม่อัตโนมัติยังไม่กำหนด
- bulk apply บางรายการล้มเหลว: ทำรายการถัดไปต่อและรายงานยอดรวม; UI ปัจจุบันไม่ได้แสดงรายละเอียดความล้มเหลวแยกราย node
- ไม่มีผลการค้นหาหรือ collection ที่เลือกไม่มีรายการ: แสดง empty state
- ข้อความว่างหรือไม่มีค่าจาก default mode: preview อาจว่าง; ข้อความแสดงแทนขึ้นกับ UI

## 12. Out-of-scope

- การแปลหรือสร้าง copy, การแก้ข้อความ, การสร้าง variables/collections, การ apply remote variables และการทำงานข้ามไฟล์
- analytics, การจัดเก็บข้อมูลผู้ใช้ และการ sync ผ่าน backend ซึ่งไม่มีใน source ที่ตรวจ

## 13. Success Metrics

- `[DRAFT]` อัตรารายการที่ผู้ใช้ apply สำเร็จต่อรายการที่เลือก
- `[DRAFT]` อัตรา apply ล้มเหลวและจำนวน unresolved ต่อจำนวน text layer ที่ระบบประเมิน
- `[DRAFT]` เวลาในการค้นหาและผูกชุด layer เทียบกับ workflow เดิม
- ไม่มี telemetry ใน repo; วัดผลผ่าน usability session หรือการทดสอบในไฟล์ตัวอย่างจนกว่าจะมีข้อกำหนดด้าน analytics

## 14. Acceptance Criteria (แยกตาม FR)

### AC--001 (สำหรับ FR--001) `[DRAFT]`

GIVEN เอกสาร Figma มีหลาย page และมี text layer หลายสถานะ  
WHEN ผู้ใช้เปิดปลั๊กอินหรือสั่งสแกนใหม่  
THEN ระบบแสดงความคืบหน้าราย page, แสดง layer ที่เข้าเงื่อนไขพร้อม candidate และนับ layer ที่จับคู่ไม่ได้

### AC--002 (สำหรับ FR--002) `[DRAFT]`

GIVEN มี local string variable ที่ชื่อเดียวกับ layer หรือชื่อ variable เดิม  
WHEN ระบบประเมิน candidate  
THEN แสดงชื่อ variable, collection และ preview; หากมีหลายตัวเลือก ผู้ใช้เลือกได้ก่อน apply

### AC--003 (สำหรับ FR--003) `[DRAFT]`

GIVEN มีผลสแกนจากหลาย page/collection  
WHEN ผู้ใช้ค้นหาหรือเลือก collection  
THEN เห็นเฉพาะรายการที่ตรงคำค้นหรือ collection และรายการยังจัดกลุ่มตาม page

### AC--004 (สำหรับ FR--004) `[DRAFT]`

GIVEN มีรายการในผลสแกน  
WHEN ผู้ใช้สั่งไปที่ layer  
THEN Figma เปลี่ยนไปยัง page ที่มี layer เลือก layer และเลื่อน/zoom viewport ไปยัง layer นั้น

### AC--005 (สำหรับ FR--005) `[DRAFT]`

GIVEN node เป็น text layer และ variable ที่เลือกยังเป็น `STRING`  
WHEN ผู้ใช้กด Apply  
THEN ระบบโหลดฟอนต์ที่จำเป็น ผูก variable กับ characters และแสดงผลสำเร็จ; หาก node/variable ใช้ไม่ได้ ให้แสดงผลล้มเหลว

### AC--006 (สำหรับ FR--006) `[DRAFT]`

GIVEN มีรายการที่เลือกและ apply ได้  
WHEN ผู้ใช้กด Apply  
THEN ระบบ apply เฉพาะรายการที่เลือก แสดงความคืบหน้าและยอดสำเร็จ/ล้มเหลว แล้วสแกนเอกสารใหม่

## 15. Open Questions

- กลุ่มผู้ใช้หลักและปัญหาทางธุรกิจที่ต้องการแก้คือใคร และมี workflow ปัจจุบันอย่างไร?
- ควรรองรับ remote variables หรือ variables ที่ได้จาก library ภายนอกหรือไม่?
- เมื่อชื่อ variable ซ้ำข้าม collection และไม่มี collection เดิมตรงกัน ควรแสดงทุกตัวเลือกหรือกำหนดกติกาเพิ่มเติม?
- ควรมีวิธีตรวจ/จัดการ layer ที่ unresolved โดยไม่ต้องแก้ชื่อ layer หรือไม่?
- ต้องการเกณฑ์ performance สำหรับไฟล์ที่มี page/layer จำนวนมากเท่าใด?
- การรายงานความล้มเหลวของ bulk apply ควรระบุ layer และสาเหตุเป็นรายรายการหรือไม่?
- มีข้อกำหนด UX, localization หรือการตรวจ WCAG 2.1 AA เพิ่มเติมนอกเหนือจาก `AGENTS.md` หรือไม่?
- ต้องการกำหนดตัวชี้วัดและวิธีวัดผลอย่างไร โดยไม่เก็บข้อมูลเอกสารผู้ใช้?

## 16. Changelog

- v1.0 — ดราฟต์จากการวิเคราะห์ไฟล์ใน repository; พฤติกรรมอ้างอิงจาก `code.ts` และ `ui.html`; เป้าหมาย/เกณฑ์ที่ไม่มีหลักฐานตรงระบุเป็น `[DRAFT]`
