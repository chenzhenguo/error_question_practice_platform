import { attachImport } from './import/preview.js';
import { attachExport } from './export/exporter.js';
import { attachBulk } from './bulk/bulk_actions.js';
import './test/auto_test.js';

window.addEventListener('DOMContentLoaded', ()=>{
  // Hook import/export/bulk
  attachImport();
  attachExport();
  attachBulk();
});