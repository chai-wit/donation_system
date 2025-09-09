const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJpnhg35l4xVOHq4KfUgpSQNDa6xWlcsZn4GOPlCDjfmtdXWwVxWZ7aKcE6o_6w1s/exec';

const homePage= document.getElementById('homePage');
const donationFormPage = document.getElementById('donationFormPage');
const showDonationFormBtn = document.getElementById('showDonationFormBtn');
const backToHomeBtn = document.getElementById('backToHomeBtn');
const donationForm = document.getElementById('donationForm');
const searchInput = document.getElementById('searchInput');
const searchCategory = document.getElementById('searchCategory');
const donorsTableBody = document.getElementById('donorsTableBody');
const totalAmountSpan = document.getElementById('totalAmount');
const totalDonorsSpan = document.getElementById('totalDonors');
const paginationButtonsContainer = document.getElementById('paginationButtons'); 

const transferDateInput = document.getElementById('transferDate');
const transferTimeInput = document.getElementById('transferTime');

const headerFullName = document.getElementById('headerFullName');
const headerOccupation = document.getElementById('headerOccupation');
const headerAmount = document.getElementById('headerAmount');
const headerTransferDate = document.getElementById('headerTransferDate');

let allDonorsData = [];
let filteredDonorsData = [];
let currentPage = 1;
const itemsPerPage = 25;
const maxPageButtons = 5;

let currentSortColumn = 'วันที่แจ้งโอนเงิน';
let currentSortDirection = 'desc';
let refreshIntervalId;

function showPage(pageToShow){
    homePage.classList.add('d-none');
    donationFormPage.classList.add('d-none');
    pageToShow.classList.remove('d-none');
}

function getCurrentDateTime() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2,'0');
    const day = String(today.getDate()).padStart(2,'0');
    const hours = String(today.getHours()).padStart(2,'0');
    const minutes = String(today.getMinutes()).padStart(2,'0');
    const seconds = String(today.getSeconds()).padStart(2,'0');
    return {date:`${year}-${month}-${day}`, time:`${hours}:${minutes}:${seconds}`};
}

function setCurrentTransferDateTime(){
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth();
    const yearBE = today.getFullYear()+543;
    const hours = String(today.getHours()).padStart(2,'0');
    const minutes = String(today.getMinutes()).padStart(2,'0');
    const seconds = String(today.getSeconds()).padStart(2,'0');
    const thaiMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    if(transferDateInput) transferDateInput.value = `${day} ${thaiMonths[month]} ${yearBE}`;
    if(transferTimeInput) transferTimeInput.value = `${hours}:${minutes}:${seconds}`;
}

function showAppAlert(message, icon, presentation='toast', showLoading=false, timer=undefined){
    let options={title:message, icon, showConfirmButton:false, allowOutsideClick:false, allowEscapeKey:false, timerProgressBar:false, timer};
    if(presentation==='toast'){
        options.toast=true;
        options.position='top-end';
        options.showConfirmButton=false;
        options.allowOutsideClick=true;
        options.allowEscapeKey=true;
    } else {
        options.toast=false;
        options.position='center';
        if(icon==='info' && showLoading){
            options.didOpen=()=>{Swal.showLoading();};
            options.timer=undefined;
        }
    }
    return Swal.fire(options);
}

async function fetchDonors(retries=3){
    for(let i=0;i<retries;i++){
        try{
            const response = await fetch(APPS_SCRIPT_URL+'?action=getDonors');
            if(!response.ok) throw new Error(`HTTP ${response.status}`);
            const rawData = await response.json();
            if(rawData.status==='error'){showAppAlert(`ข้อผิดพลาด: ${rawData.message}`,'error','modal'); return [];}
            if(!Array.isArray(rawData)) throw new Error("Invalid data format");
            return rawData;
        } catch(err){
            console.error('fetchDonors attempt',i+1,err);
            if(i<retries-1){await new Promise(r=>setTimeout(r,Math.pow(2,i)*1000));}
            else {showAppAlert('ไม่สามารถโหลดข้อมูลผู้บริจาคได้','error','modal'); return [];}
        }
    }
    return [];
}

function sortTable(columnKey){
    if(currentSortColumn===columnKey) currentSortDirection=currentSortDirection==='asc'?'desc':'asc';
    else{
        currentSortColumn=columnKey;
        currentSortDirection=(columnKey==='จำนวนเงิน'||columnKey==='วันที่แจ้งโอนเงิน')?'desc':'asc';
    }
    filteredDonorsData.sort((a,b)=>{
        let valA=a[columnKey], valB=b[columnKey];
        if(columnKey==='จำนวนเงิน'){valA=parseFloat(valA)||0; valB=parseFloat(valB)||0; return currentSortDirection==='asc'?valA-valB:valB-valA;}
        if(columnKey==='วันที่แจ้งโอนเงิน'){const dateA=new Date(`${a['วันที่แจ้งโอนเงิน']||'1970-01-01'}T${a['เวลาแจ้งโอนเงิน']||'00:00:00'}`); const dateB=new Date(`${b['วันที่แจ้งโอนเงิน']||'1970-01-01'}T${b['เวลาแจ้งโอนเงิน']||'00:00:00'}`); return currentSortDirection==='asc'?dateA-dateB:dateB-dateA;}
        const strA=String(valA||'').toLowerCase(), strB=String(valB||'').toLowerCase();
        return currentSortDirection==='asc'?strA.localeCompare(strB):strB.localeCompare(strA);
    });
    currentPage=1;
    renderTable(filteredDonorsData);
}

function renderTable(donors){
    try{
        if(!Array.isArray(donors)){donorsTableBody.innerHTML='<tr><td colspan="5" class="text-center text-danger py-4">ข้อมูลไม่ถูกต้อง</td></tr>'; return;}
        const totalPages=Math.ceil(donors.length/itemsPerPage);
        if(currentPage<1) currentPage=1;
        if(currentPage>totalPages&&totalPages>0) currentPage=totalPages;
        if(totalPages===0) currentPage=0;
        const startIndex=(currentPage-1)*itemsPerPage;
        const endIndex=startIndex+itemsPerPage;
        const paginated=donors.slice(startIndex,endIndex);

        document.querySelectorAll('.table thead th').forEach(th=>{
            const icon=th.querySelector('.sort-icon');
            if(icon) icon.textContent='';
            const key=th.getAttribute('data-sort-key');
            if(key===currentSortColumn) if(icon) icon.textContent=currentSortDirection==='asc'?' ▲':' ▼';
        });

        if(paginated.length===0){donorsTableBody.innerHTML='<tr><td colspan="5" class="text-center text-info py-4">'+(searchInput.value.trim()!==''?'ไม่พบข้อมูลผู้บริจาคที่ตรงกับคำค้นหา':'ไม่มีข้อมูล')+'</td></tr>';}
        else{
            donorsTableBody.innerHTML='';
            paginated.forEach((donor,i)=>{
                const row=donorsTableBody.insertRow();
                row.insertCell(0).textContent=startIndex+i+1;
                row.insertCell(1).textContent=donor['ชื่อ-นามสกุล']||'-';
                row.insertCell(2).textContent=donor['รุ่น/อาชีพ']||'-';
                row.insertCell(3).textContent=parseFloat(donor['จำนวนเงิน']).toLocaleString('th-TH')||'0';
                row.insertCell(4).textContent=donor['วันที่แจ้งโอนเงิน']?new Date(donor['วันที่แจ้งโอนเงิน']).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'-';
            });
        }

        const totalAmount=allDonorsData.reduce((sum,d)=>sum+(parseFloat(d['จำนวนเงิน'])||0),0);
        const donorCount=allDonorsData.length;
        totalAmountSpan.textContent=totalAmount.toLocaleString('th-TH');
        totalDonorsSpan.textContent=donorCount;

        paginationButtonsContainer.innerHTML='';
        if(totalPages>0){
            const createBtn=(p,t,d=false,a=false)=>{const b=document.createElement('button'); b.textContent=t; b.classList.add('pagination-btn'); if(a)b.classList.add('active'); if(d)b.disabled=true; b.addEventListener('click',()=>{currentPage=p;renderTable(donors);}); return b;};
            paginationButtonsContainer.appendChild(createBtn(currentPage-1,'« หน้าก่อนหน้า',currentPage===1));
            const startPage=Math.max(1,currentPage-Math.floor(maxPageButtons/2));
            const endPage=Math.min(totalPages,startPage+maxPageButtons-1);
            if(startPage>1){const ell=document.createElement('span'); ell.textContent='...'; ell.classList.add('pagination-ellipsis'); paginationButtonsContainer.appendChild(ell);}
            for(let i=startPage;i<=endPage;i++) paginationButtonsContainer.appendChild(createBtn(i,i.toString(),false,i===currentPage));
            if(endPage<totalPages){if(endPage<totalPages-1){const ell=document.createElement('span'); ell.textContent='...'; ell.classList.add('pagination-ellipsis'); paginationButtonsContainer.appendChild(ell);} paginationButtonsContainer.appendChild(createBtn(totalPages,totalPages.toString()));}
            paginationButtonsContainer.appendChild(createBtn(currentPage+1,'หน้าถัดไป »',currentPage===totalPages));
        }
    } catch(err){console.error('renderTable error:',err);}
}

function filterDonors(){
    const term=searchInput.value.toLowerCase().trim();
    const category=searchCategory.value;
    filteredDon
