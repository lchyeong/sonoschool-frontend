//공통값

function alertLayer(msg, title, callback) {
	let targetBody = $('body');
	if($('#layout_header').length == 0) {
		targetBody = $(parent.document.body);
	}

	const rndStr = generateRandomString(10);

	let html = `
    <div class="msg_layer" id="alert_layer_${rndStr}">
        <div class="modal_wrap">
            <div class="scroll_box">
                <div class="modal_cont">
                    <div class="cont">
                        <p class="alertMessage_${rndStr}"></p>
                        <div class="btn_wrap">
                            <button class="btm_btn small" id="alertBtn_${rndStr}">확인</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

	targetBody.append(html);

	const modal = targetBody.find('#alert_layer_'+rndStr);
	const modalMessage = targetBody.find('.alertMessage_'+rndStr);

	// 모달에 제목과 메시지 설정
	//$(modalTitle).text(title);
	modalMessage.html(msg);

	const alertBtn = targetBody.find('#alertBtn_'+rndStr);
	modal.addClass('open');

	// 포커스 제거
	document.activeElement.blur();

	alertBtn.on('click', function() {
		targetBody.find('#alert_layer_'+rndStr).remove();
		if (callback) callback();
	});

	// 엔터 및 스페이스 키 이벤트 처리
	$(document).on('keydown.alertLayer', function(e) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const topModal = $('.msg_layer').last();
			if (topModal.length) {
				topModal.find('.btm_btn').click();
			}
		}
	});

	// alertLayer가 닫힐 때 이벤트 핸들러 제거
	alertBtn.on('click', function() {
		$(document).off('keydown.alertLayer');
	});
}

function confirmLayer( message, title, yesCallback, noCallback) {
	let targetBody = $('body');
	if($('#layout_header').length == 0) {
		targetBody = $(parent.document.body);
	}

	const rndStr = generateRandomString(10);

	let html = `
    <div class="msg_layer" id="confirm_layer_${rndStr}">
        <div class="modal_wrap">
            <div class="scroll_box">
                <div class="modal_cont">
                    <div class="cont">
                        <p class="confirmMessage_${rndStr}"></p>
                        <div class="btn_wrap">
                            <button class="btm_btn small" id="confirmBtn_${rndStr}">확인</button>
                            <button class="btm_btn small wh" id="cancelBtn_${rndStr}" >취소</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

	targetBody.append(html);

	// 모달 요소 가져오기
	const modal = targetBody.find('#confirm_layer_'+rndStr);
	const modalTitle = targetBody.find('.confirmTitle_'+rndStr);
	const modalMessage = targetBody.find('.confirmMessage_'+rndStr);
	const confirmBtn = targetBody.find('#confirmBtn_'+rndStr);
	const cancelBtn = targetBody.find('#cancelBtn_'+rndStr);

	if(title == '') {
		targetBody.find('#confirm_layer_'+rndStr+' .tit_wrap').hide();
	} else {
		targetBody.find('#confirm_layer'+rndStr+' .tit_wrap').show();
	}
	// 모달에 제목과 메시지 설정
	modalTitle.text(title);
	modalMessage.html(message);

	// 모달 보이기
	targetBody.find('#confirm_layer_'+rndStr).addClass('open');

	// 포커스 제거
	document.activeElement.blur();


	// 확인 버튼 클릭 시 콜백 함수 호출 및 모달 닫기
	confirmBtn.on('click', function() {
		targetBody.find('#confirm_layer_' + rndStr).remove();
		if (yesCallback) yesCallback();
		$(document).off('keydown.confirmLayer');
	});

	// 취소 버튼 클릭 시 콜백 함수 호출 및 모달 닫기
	cancelBtn.on('click', function() {
		targetBody.find('#confirm_layer_' + rndStr).remove();
		if (noCallback) noCallback();
		$(document).off('keydown.confirmLayer');
	});


	// 엔터 및 스페이스 키 이벤트 처리
	$(document).on('keydown.confirmLayer', function(e) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			const topModal = $('.msg_layer').last();
			if (topModal.length) {
				topModal.find('#confirmBtn_' + rndStr).click();
			}
		}
	});
	/*
	 // 닫기 버튼 클릭 시 모달 닫기
	 closeBtn.on('click', function() {
	 targetBody.find('#confirm_layer_' + rndStr).remove();
	 if (noCallback) noCallback();
	 });
	 */
	// 모달 외부를 클릭하면 모달 닫기
	$(window).on('click', function(event) {
		if (event.target == modal[0]) {
			targetBody.find('#confirm_layer_' + rndStr).remove();
			if (noCallback) noCallback();
			lenis.start();
		}
	});
}


// 레이어 닫기
function closeMsgLayer() {
	$('.msg_layer').removeClass('open');
}




var loadingYn = 'Y';
var subMenuViewYn = 'N';

function copyLink(){
	var t = document.createElement("textarea");
	document.body.appendChild(t);
	t.value = '<?=$curUrl?>';
	//p가 community_sns_view 이거나 community_contents_view이거면 공유수 올려주기
	t.select();
	document.execCommand('copy');
	document.body.removeChild(t);
	alert('클립보드에 복사되었습니다');

}

//* LNB Navigation */
function activeLNB(id, cnt, n) {
	for(num=1; num<=parseInt(cnt); num++) {
		$("#Um"+num).removeClass("current");
		$("#Lm"+num).css("visibility", "hidden");
		$("#Lm"+num).css("display", "none");
	}
	$("#Um"+n).addClass("current");
	$("#"+id).css("visibility", "visible"); //해당 ID만 보임
	$("#"+id).css("display", "block"); //해당 ID만 보임
}

function onblueLNB(id) {
	$("#"+id).css("visibility", "hidden");
	$("#"+id).css("display", "none");
}
/*기본형 스타일 끝*/

// 순서 변경에 사용; 드래그시 배경색 및 가로 세로 사이즈 유지에 사용
var fixHelper = function(e, ui) {
	ui.children().each(function() {
		$(this).width($(this).width());
		$(this).height($(this).height());
		$(this).parent().css('background-color','#f5fdff');

	});
	return ui;
};


/*헤더 DropDown style*/


//* LNB Navigation */
function activeLNB1(id, cnt, n) {
	$("#Um"+n).addClass("current");

	for(num=1; num<=parseInt(cnt); num++) {
		if (subMenuViewYn=='N') {
			$("#Lm1"+num).show().animate({height:'200px'},300);
		}
	}
	if (subMenuViewYn=='N') {
		$('#subMenuBg').slideDown(300);
		$('#lnb1').height('240');
		$('#subMenuBgBottom').css('display','block');
		$('.dimmed').show();
	}
	subMenuViewYn='Y';
	$('#showYn').text(subMenuViewYn);

}

function onblueLNB1(cnt, n) {
	$("#Um"+n).addClass("current");
	for(num=1; num<=parseInt(cnt); num++) {
		if (subMenuViewYn=='Y') {
			$("#Lm1"+num).animate({height:'0px'},100);
		}
	}
	if (subMenuViewYn=='Y') {
		$('#subMenuBg').slideUp(100);
		$('#lnb1').animate({height:'71px'},100);
		$('#subMenuBgBottom').css('display','none');
		$('.dimmed').hide();
	}
	subMenuViewYn='N';
	$('#showYn').text(subMenuViewYn);

}
/*퓨처헤더 style 끝*/

function activeLNBM(id, cnt) {
	for(num=1; num<=parseInt(cnt); num++) {
		$("#Lm"+num).css("visibility", "visible");
	}
}
function activeLNBM1(id, cnt) {
	for(num=1; num<=parseInt(cnt); num++) {
		$("#Lm1"+num).css("visibility", "visible");
	}
}




/* image rollover */
$(document).ready(function() {

	$('.cont.ck-content a').on('click', function (event) {
		console.log("CL")
		event.preventDefault(); // 기본 동작 방지
		window.open(this.getAttribute("href"), "_blank");
	})

	$("img.rollover").mouseover(function() {
		$(this).attr("src", $(this).attr("src").replace("_off","_on"));
	});
	$("img.rollover").mouseout(function() {
		$(this).attr("src", $(this).attr("src").replace("_on", "_off"));
	});

	//가로스크롤값 구하는 함수
	var scrollArea = document.getElementById('scroll_tab');
	if(scrollArea != null){
		scrollArea.addEventListener('scroll', function() {
			var scrollTopValue = scrollArea.scrollLeft;

			scrollX = scrollTopValue;
			console.log("scrollX",scrollX)
		});
	}

});

function scrollPage(page, lang){
	$url = '';
	if(lang != ''){
		$url = '/'+lang;
	}
	location.href = $url+"/?p="+page+"&sc="+scrollX;
}

//처리후 마무리하는 script
/*
 0:결과 기호 OK / 그외
 1:결과메세지
 2:link주소
 3:함수명
 */
function scriptEnd(v) {
	var vSplit = v.split('||');
	var vLen = vSplit.length;
	if (vSplit[0]=='OK') {
		if (vSplit[1]!='') {
			alert(vSplit[1]);
		}
		if (vSplit[2]!='') {
			linkScript(vSplit[2]);
		}
		if (vLen>3) {
			for (ii=3;ii<vLen;ii++) {
				scriptExec(vSplit[ii]);
			}
		}
	} else {
		alert(v);
	}
}
function scriptExec(fnExe) {
	alert(fnExe);
	fnExe;
}
function linkScript(v) {
	location.href=v;
}

function getCookie(strName) {
	var strArg = new String(strName + "=");
	var nArgLen, nCookieLen, nEnd;
	var i = 0, j;
	nArgLen    = strArg.length;
	nCookieLen = document.cookie.length;
	if(nCookieLen > 0) {
		while(i < nCookieLen) {
			j = i + nArgLen;
			if(document.cookie.substring(i, j) == strArg) {
				nEnd = document.cookie.indexOf (";", j);
				if(nEnd == -1) nEnd = document.cookie.length;
				return unescape(document.cookie.substring(j, nEnd));
			}
			i = document.cookie.indexOf(" ", i) + 1;
			if (i == 0) break;
		}
	}
	return("");
}

function setCookie( name, value, expiredays ) {
	var todayDate = new Date();
	todayDate.setDate( todayDate.getDate() + expiredays );
	document.cookie = name + "=" + escape( value ) + "; path=/; expires=" + todayDate.toGMTString() + ";"
}

function deleteCookie(cookieName){
	var expireDate = new Date();
	expireDate.setDate(expireDate.getDate() - 1);
	document.cookie = cookieName + "= " + "; expires=" + expireDate.toGMTString();
}

function closeWinPop(getID, dd){
	if ($('#popWin'+getID).is(':checked') == true) {
		setCookie('WP'+getID, "done" ,dd );
	}
	window.close();
}
function closeLayerPop(getID, dd){
	if ($('#popLayer'+getID).is(':checked') == true) {
		setCookie('LP'+getID, "done" ,dd );
	}
	$("#layer_popup"+getID).hide();
	$(".popupBg").hide();
	$('body').css('overflow-y', 'auto');
}


//레이어 팝업 열기
function openLayer(IdName, tpos, lpos){
	$('#bgClose').css('height', $(document).height()+'px');
	$('#bgClose').css('display', 'block');

	var pop = document.getElementById(IdName);
	var scrollPos = ($(document).scrollTop());
	pop.style.display = "block";
	if (tpos=='') {
		var iHeight = ($(window).height() - $('#'+IdName).outerHeight())/2;
		pop.style.top = (iHeight+scrollPos) + "px";
	} else {
		pop.style.top = tpos + "px";
	}
	if (lpos=='') {
		var iWidth = ($(window).width() - $('#'+IdName).outerWidth())/2;
		pop.style.left = iWidth + "px";
	} else {
		pop.style.left = lpos + "px";
	}
}

//레이어 팝업 닫기
function closeLayer(IdName){
	var pop = document.getElementById(IdName);
	pop.style.display = "none";
	$('#bgClose').css('display', 'none');
}

function layerPopViewEnd(v) {
	openLayer('popView','','');
}

//레이어 중앙정렬
function centerLayer(divid) {
	var pop = document.getElementById(divid);
	var scrollPos = ($(document).scrollTop());

	var iHeight = ($(window).height() - $('#'+divid).outerHeight())/2;
	var iWidth = ($(window).width() - $('#'+divid).outerWidth())/2;
	pop.style.top = (iHeight+scrollPos) + "px";
	pop.style.left = iWidth + "px";
}

function fnOpenLayer(IdName){
	$('#'+IdName).show();
	var posTop = ($(window).height() - $('#'+IdName+' .pop_contents').height())/2;
	var posLeft = ($(window).width() - $('#'+IdName+' .pop_contents').width())/2;

	$('#'+IdName+' .pop_contents').css({'top':posTop+'px' , 'left':posLeft+'px'});
	$('body').css('overflow','hidden');
}
function fnCloseLayer(IdName){
	$('#'+IdName).hide();
	$('body').css('overflow','auto');
}

//체크박스 공통함수
function checkToggle(chkid, chknm) {
	if ($('#'+chkid).is(':checked')==true) {
		$('input:checkbox[id^='+chknm+']').prop('checked',true);
	} else {
		$('input:checkbox[id^='+chknm+']').prop('checked',false);
	}
}

function checkToggle2(obj, chknm) {
	if (obj) {
		$('input:checkbox[id="'+chknm+'"]').prop('checked', obj);
	} else {
		$('input:checkbox[id="'+chknm+'"]').prop('checked', obj);
	}
}

//ajax 처리 
function ajaxProc(divid, frmnm, urlLink, pa, returnData) {
	if (frmnm!='') {
		if (pa!='') {
			pa = $('#'+frmnm).serialize() + '&'+ pa;
		} else {
			pa = $('#'+frmnm).serialize();
		}
	}
	if (loadingYn=='Y') {
		$('#loading').show();
	}
	$.ajax({
		url : urlLink
		,type : 'POST'
		,dataType : 'html'
		,contentType :"application/x-www-form-urlencoded;charset=UTF-8"
		,data : pa
		,beforeSend: function() {
		}
		,success : function(data) {
			$('#loading').hide();
			if (divid!='') {
				$('#'+divid).html(data);
			}
			if (returnData != '') {
				returnData(data);
			}
		}
		,error : function(xhr, ajaxOptions, thrownError) {
			$('#loading').hide();
			alert(xhr.status + " : " + thrownError);
		}

	});
}


//ajax 처리 
function ajaxJsonProc(divid, frmnm, urlLink, pa, returnData) {
	if (frmnm!='') {
		if (pa!='') {
			pa = $('#'+frmnm).serialize() + '&'+ pa;
		} else {
			pa = $('#'+frmnm).serialize();
		}
	}
	if (loadingYn=='Y') {
		$('#loading').show();
	}
	$.ajax({
		url : urlLink
		,type : 'POST'
		,dataType : 'json'
		,contentType :"application/x-www-form-urlencoded;charset=UTF-8"
		,data : pa
		,beforeSend: function() {
		}
		,success : function(data) {

			$('#loading').hide();
			if (divid!='') {
				$('#'+divid).html(data);
			}
			if (returnData != '') {
				returnData(data);
			}
		}
		,error : function(xhr, ajaxOptions, thrownError) {
			$('#loading').hide();
			alert(xhr.status + " : " + thrownError);
		}

	});
}

//ajax 이미지 form 업로드 처리 
function ajaxMultiProc(divid, returnData) {
	if (loadingYn=='Y') {
		$('#loading').show();
	}
	$('#'+divid).ajaxSubmit({
		type:"POST",
		dataType:"html",
		contentType :"application/x-www-form-urlencoded;charset=UTF-8",
		beforeSend: function() {
		},
		uploadProgress: function(event, position, total, percentComplete) {
		},
		success: function( data ){
			$('#loading').hide();
			returnData(data);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			$('#loading').hide();
			alert(xhr.status + " : " + thrownError);
		}
	});
}

//ajax 이미지 form 업로드 처리
function ajaxMultiJsonProc(divid, returnData) {
	if (loadingYn=='Y') {
		$('#loading').show();
	}
	$('#'+divid).ajaxSubmit({
		type:"POST",
		dataType:"json",
		contentType :"application/x-www-form-urlencoded;charset=UTF-8",
		beforeSend: function() {
		},
		uploadProgress: function(event, position, total, percentComplete) {
		},
		success: function( data ){
			$('#loading').hide();
			returnData(data);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			$('#loading').hide();
			alert(xhr.status + " : " + thrownError);
		}
	});
}

//ajax 이미지 form 업로드 처리 
function ajaxFileUploadProc(divid, fileRef, returnData) {
	loadingYn = 'Y';
	if (loadingYn=='Y') {
		$('#loading').show();
	}

	var form = new FormData();
	form.append( "file", $("#"+divid)[0].files[0] );
	form.append( "fileRef", fileRef );

	jQuery.ajax({
		url : "/_Prog/common/fileUpload.php"
		, type : "POST"
		, processData : false
		, contentType : false
		, data : form
		, success:function(data) {
			$('#loading').hide();

			if (returnData != '') {
				returnData(data);
			}
		}
		,error: function (jqXHR)
		{
			alert(jqXHR.responseText);
		}
	});
}


/*sns 연동 관련*/
function pstTwitter(msg,url) {
	var href = "http://twitter.com/share?text=" + encodeURIComponent(msg) + "&url=" + encodeURIComponent(url);
	var a = window.open(href, 'twitter', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}
function pstMe2Day(msg,url,tag) {
	var href = "http://me2day.net/posts/new?new_post[body]=" + encodeURIComponent(msg) + " " + encodeURIComponent(url) + "&new_post[tags]=" + encodeURIComponent(tag);
	var a = window.open(href, 'me2Day', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}

//페이스북은 og 태그를 변경해야 함
function pstFaceBook(msg,url, tag, img) {
	//var href = "http://www.facebook.com/sharer.php?u=" + encodeURIComponent(url) + "&t=" + encodeURIComponent(msg) +"&i="+ encodeURIComponent(tag);
	var href="";
	href = "http://www.facebook.com/sharer/sharer.php?u="+ encodeURIComponent(url);
	//          +"&p[images][0]="+ encodeURIComponent(img)
	//          +"&p[title]="+ encodeURIComponent(msg)
	//          +"&p[summary]="+encodeURIComponent(tag);
	//href = href.split("#").join("%23");

	//href = encodeURI(href);
	//	alert(href);
	//return;
	var a = window.open(href, 'facebook', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}

function pstYozmDaum(link,prefix,parameter) {
	var href = "http://yozm.daum.net/api/popup/prePost?link=" + encodeURIComponent(link) + "&prefix=" + encodeURIComponent(prefix);
	var a = window.open(href, 'yozm', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}

function pstTwitterMobile(msg,url) {
	var href = "http://twitter.com/intent/tweet?p__g=i__n&text=" + encodeURIComponent(msg) + " " + encodeURIComponent(url);
	var a = window.open(href, 'twitter', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}
function pstFaceBookMobile(msg,url, tag, img) {
	//var href = "http://www.facebook.com/sharer.php?u=" + encodeURIComponent(url) + "&t=" + encodeURIComponent(msg) +"&i="+ encodeURIComponent(tag);
	var href="";
	href = "http://m.facebook.com/sharer.php?p__g=i__n&s=100&u="+ encodeURIComponent(url);
	//href = href.split("#").join("%23");

	//href = encodeURI(href);
	//alert(href);

	var a = window.open(href, 'facebook', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}

function pstNaverBlog(msg,url, tag, img) {
	var href="";
	href = "http://blog.naver.com/ScrapForm.nhn?blogId=naver&source_type=3&title="+msg+"&source_url="+encodeURIComponent(url);
	var a = window.open(href, 'facebook', 'width=466, height=356');
	if ( a ) {
		a.focus();
	}
}

function snsCon(g, msg, url, tag, img) {
	if (g=="tw") {
		pstTwitter(msg,url);
	} else if (g=="fb") {
		pstFaceBook(msg,url, tag, img);
	} else if (g=="mt") {
		pstMe2Day(msg,url,tag);
	} else if (g=="yz") {
		pstYozmDaum(url,msg, '')
	} else if (g=="nb") {
		pstNaverBlog(msg,url, '')
	}
}

function snsConMobile(g, msg, url, tag, img) {
	if (g=="tw") {
		pstTwitterMobile(msg,url);
	} else if (g=="fb") {
		pstFaceBookMobile(msg,url, tag, img);
	}
}

//kakao init 을 실행한후 실행해야함
function kakaoTalkShare(tit, desc, img, linkUrl) {
	Kakao.Link.sendDefault({
		objectType: 'feed',
		content: {
			title: tit,
			description: desc,
			imageUrl: img,
			link: {
				mobileWebUrl: linkUrl,
				webUrl: linkUrl
			}
		},
		buttons: [
			{
				title: '웹으로 보기',
				link: {
					mobileWebUrl: linkUrl,
					webUrl: linkUrl
				}
			},
			{
				title: '앱으로 보기',
				link: {
					mobileWebUrl: linkUrl,
					webUrl: linkUrl
				}
			}
		]
	});
	/*
	 Kakao.Link.sendTalkLink({
	 label: tit,
	 image: {
	 src : img,
	 width : '300',
	 height : '200'
	 }
	 });
	 */
}

/** ------------------------------------------------------------------------------------------------
 fnOnlyNumber() - 숫자만입력을받는다
 사용예)
 onkeydown="return onlyNumber(event);" onkeyup="removeChar(event);" style="ime-mode:disabled;"
 ------------------------------------------------------------------------------------------------**/
function onlyNumber(event){
	event = event || window.event;
	var keyID = (event.which) ? event.which : event.keyCode;
	if ( (keyID >= 48 && keyID <= 57) || (keyID >= 96 && keyID <= 105) || keyID == 8 || keyID == 9 || keyID == 46 || keyID == 37 || keyID == 39 || keyID == 190 || keyID == 110 || keyID == 109 || keyID == 45 || keyID == 189 )
		return;
	else
		return false;
}

function validateNumericInput(input) {
	//숫자 이외의 문자를 모두 제거합니다.
	input.value = input.value.replace(/[^0-9]/g, '');
}


function removeChar(event) {
	event = event || window.event;
	var keyID = (event.which) ? event.which : event.keyCode;
	if ( keyID == 8 || keyID == 46 || keyID == 37 || keyID == 39 )
		return;
	else
		event.target.value = event.target.value.replace(/[^-\.\,0-9]/g, "");
}

// 영어 / 숫자 / 특수문자만 입력 가능 (값 리셋)
function fnOnlyEngNumberSpecial(objID){
	$(objID).keyup(function(event){
		if (!(event.keyCode >=37 && event.keyCode<=40)) {
			var inputVal = $(this).val();
			$(this).val(inputVal.replace(/[^a-z0-9-@._!)(#$]/gi,''));
		}
	});
}

function numberViewKorean(viewId, num, unit) {
	var hanA = new Array("","일","이","삼","사","오","육","칠","팔","구","십");
	var danA = new Array("","십","백","천","","십","백","천","","십","백","천","","십","백","천");
	var result = "";
	num = num.replace(/,/g,'');
	for(i=0; i<num.length; i++) {
		str = "";
		han = hanA[num.charAt(num.length-(i+1))];
		if(han != "") str += han+danA[i];
		if(i == 4) str += "만";
		if(i == 8) str += "억";
		if(i == 12) str += "조";
		result = str + result;
	}
	if (num != 0) {
		result = result + " "+ unit;
	}
	//return result ; 
	$('#'+viewId).text(result);
}

function regChk(f, ty){
	var msg='';
	if (ty=='kor') {
		regexp = /^[\ㄱ-ㅎ ㅏ-ㅣ 가-힣\s]+$/;
		msg = '한글만';
	} else if (ty=='num') {
		regexp = /^[0-9]+$/;
		msg = '숫자만';
	} else if (ty=='eng') {
		regexp = /^[a-zA-Z\s]+$/;
		msg = '영문만';
	} else if (ty=='numeng') {
		regexp = /^[a-zA-Z0-9]+$/;
		msg = '숫자와 영문만';
	} else if (ty=='koreng') {
		regexp = /^[가-힣a-zA-Z]+$/;
		msg = '한글과 영문만';
	}
	v = $('#'+f).val();
	if( !regexp.test(v) ) {
		if (event.keyCode==8 || event.keyCode==9 || event.keyCode==37 || event.keyCode==39 || event.keyCode==46 ) {
		} else {
			alert(msg+"입력하세요");
			$('#'+f).val('');
		}
	}
	/*
	 if((event.keyCode < 12592) || (event.keyCode > 12687)){
	 alert("한글만 입력이 가능합니다.");
	 //f = '';
	 event.returnValue = false
	 }
	 */
}

function fnCheckPassword(upw) {
	regexp = /^[a-zA-Z0-9]{6,20}$/;
	if(!regexp.test(upw)) {
		alert('비밀번호는 숫자와 영문자 조합으로 6~12자리를 사용해야 합니다.');
		return;
	}

	var chk_num = $('#'+upw).val().search(/[0-9]/g);
	var chk_eng = $('#'+upw).val().search(/[a-z]/ig);
	if(chk_num < 0 || chk_eng < 0) {
		alert('비밀번호는 숫자와 영문자를 혼용하여야 합니다.');
		$('#'+upw).val('');
		$('#'+upw).focus();
		return;
	}
	if(/(\w)\1\1\1/.test($('#'+upw).val())) {
		alert('비밀번호에 같은 문자를 4번 이상 사용하실 수 없습니다.');
		$('#'+upw).val('');
		$('#'+upw).focus();
		return;
	}
	return;
}

//다음 주소검색
// f1:zonecode, f2: addr1, f3:addr2 f4:addrOld
function daumZipSearch(f1, f2, f3, f4) {
	new daum.Postcode({
		oncomplete: function(data) {
			if (f1!='') {
				document.getElementById(f1).value = data.zonecode;
			}
			/*
			 //전체 주소에서 연결 번지 및 ()로 묶여 있는 부가정보를 제거하고자 할 경우,
			 //아래와 같은 정규식을 사용해도 된다. 정규식은 개발자의 목적에 맞게 수정해서 사용 가능하다.
			 var addr = data.address.replace(/(\s|^)\(.+\)$|\S+~\S+/g, '');
			 document.getElementById(f3).value = addr;
			 */

			if (f2!='') {
				var addr = data.roadAddress.replace(/(\s|^)\(.+\)$|\S+~\S+/g, '');
				document.getElementById(f2).value = addr;
			}

			if (f4!='') {
				var addr = data.jibunAddress.replace(/(\s|^)\(.+\)$|\S+~\S+/g, '');
				document.getElementById(f4).value = addr;
			}

			if (f3!='') {
				document.getElementById(f3).focus();
			}
		}
	}).open();
}

//날짜 기간설정 (1주일/한달/3개월)
//v : 구분(w, m, 3m)
function setDate(sdate, edate, v) {
	var eD = $('#'+edate).val();
	var today;
	var year;
	var month;
	var day;

	if (eD=='') {
		today = new Date();
		year = today.getFullYear();
		month = today.getMonth()+1;
		day = today.getDate();
	} else {
		var eDSplit = eD.split('-');
		year = eDSplit[0];
		month = parseInt(eDSplit[1]);
		day = parseInt(eDSplit[2]);
	}
	if (month<10) {
		month = '0'+month;
	}
	if (day<10) {
		day = '0'+day;
	}

	var curD = year+'-'+month+'-'+day;

	$('#'+edate).val(curD);

	var resultDate;
	if (v=='w') {
		resultDate = new Date(year, month-1, day-7);
	} else if (v=='m') {
		resultDate = new Date(year, month-2, day);
	} else if (v=='3m') {
		resultDate = new Date(year, month-4, day);
	}

	year = resultDate.getFullYear();
	month = resultDate.getMonth()+1;
	day = resultDate.getDate();

	if (month<10) {
		month = '0'+month;
	}
	if (day<10) {
		day = '0'+day;
	}
	var resD = year+'-'+month+'-'+day;
	$('#'+sdate).val(resD);
}

//숫자콤마
function comma(str) {
	var parts=str.toString().split(".");

	str = String(parts[0]);
	str = String(str).replace(/,/gi,'');
	str = str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
	if (parts.length==2) {
		str = str +'.'+ parts[1];
	}
	return str;
	//return str.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
}

//콤마풀기
function uncomma(str) {
	str = String(str);
	return str.replace(/[^\d]+/g, '');
}

//글자수 제한 체크 
function len_chk(txtid, len, lenchk) {
	var txtLength = $('#'+txtid).val().length;

	if(txtLength > len){
		alert("글자수는 "+len+"자로 제한됩니다.!");
		$('#'+txtid).val($('#'+txtid).val().substring(0,len));
		$('#'+txtid).focus();
	}
	if (lenchk!='') {
		$('#'+lenchk).text(txtLength+'/'+len+' bytes');
	}
}

function regChk2(f, ty){
	var msg='';
	if (ty=='kor') {
		regexp = /^[\ㄱ-ㅎ ㅏ-ㅣ 가-힣\s]+$/;
		msg = '한글만';
	} else if (ty=='num') {
		regexp = /^[0-9]+$/;
		msg = '숫자만';
	} else if (ty=='eng') {
		regexp = /^[a-zA-Z\s]+$/;
		msg = '영문만';
	} else if (ty=='numeng') {
		regexp = /^[a-zA-Z0-9]+$/;
		msg = '숫자와 영문만';
	} else if (ty=='koreng') {
		regexp = /^[가-힣a-zA-Z]+$/;
		msg = '한글과 영문만';
	}
	v = $('#'+f).val();

	if( !regexp.test(v) ) {
		alert(msg+"입력하세요");
		$('#'+f).val('');
		return false;
	}
	return;

}

function regChk(f, ty){
	var msg='';
	if (ty=='kor') {
		regexp = /^[\ㄱ-ㅎ ㅏ-ㅣ 가-힣\s]+$/;
		msg = '한글만';
	} else if (ty=='num') {
		regexp = /^[0-9]+$/;
		msg = '숫자만';
	} else if (ty=='eng') {
		regexp = /^[a-zA-Z\s]+$/;
		msg = '영문만';
	} else if (ty=='numeng') {
		regexp = /^[a-zA-Z0-9]+$/;
		msg = '숫자와 영문만';
	} else if (ty=='koreng') {
		regexp = /^[가-힣a-zA-Z]+$/;
		msg = '한글과 영문만';
	}
	v = $('#'+f).val();
	//alert(event.keyCode);
	if( !regexp.test(v) ) {
		if (event.keyCode==8 || event.keyCode==13 || event.keyCode==9 || event.keyCode==37 || event.keyCode==39 || event.keyCode==46 || event.keyCode==93 || event.keyCode==229 || event.keyCode==116 ) {
			event.returnValue = false;
		} else {
			alert(msg+"입력하세요");
			$('#'+f).val('');
			event.returnValue = false;
			return false;
		}
	}
	event.returnValue = false;
	/*
	 if((event.keyCode < 12592) || (event.keyCode > 12687)){
	 alert("한글만 입력이 가능합니다.");
	 //f = '';
	 event.returnValue = false
	 }
	 */
}

//사용자 출력 함수
function printUser(divid) {

	$("#"+divid).print({
		addGlobalStyles : '/inc/css/CMS.css',
		stylesheet : '/inc/css/CMS.css',
		rejectWindow : true,
		noPrintSelector : ".no-print",
		iframe : true,
		append : null,
		prepend : null
	});
}

//관리자 출력 함수
function printMng(divid) {

	$("#"+divid).print({
		addGlobalStyles : '<?=AdminPath?>/inc/css/sub.css',
		stylesheet : '<?=AdminPath?>/inc/css/board.css',
		rejectWindow : true,
		noPrintSelector : ".no-print",
		iframe : true,
		append : null,
		prepend : null
	});
}

//이미지 확장자 체크
function fnImgExtCheck(id){
	var strFile = $("#"+id).val();
	var ext = strFile.split('.').pop().toLowerCase();
	if($.inArray(ext, ['gif','jpg','jpeg','png']) == -1) {
		return false;
	} else{
		return true;
	}
}

//셀렉트박스의 선택값 가져오기
function fnSelectGetItem(md, id){
	var retval;
	if(md=='value'){
		retval = $("#"+id+" option:selected").val();
	} else {
		retval = $("#"+id+" option:selected").text();
	}
	return retval;
}

//브라우저 체크
function getVersionIE () {
	var word;
	var version = "N/A";

	var agent = navigator.userAgent.toLowerCase();
	var name = navigator.appName;

	// IE old version ( IE 10 or Lower ) 
	if ( name == "Microsoft Internet Explorer" ) word = "msie ";

	else {
		// IE 11 
		if ( agent.search("trident") > -1 ) word = "trident/.*rv:";

		// IE 12  ( Microsoft Edge ) 
		else if ( agent.search("edge/") > -1 ) word = "edge/";
	}

	var reg = new RegExp( word + "([0-9]{1,})(\\.{0,}[0-9]{0,1})" );

	if (  reg.exec( agent ) != null  ) version = RegExp.$1 + RegExp.$2;
	return version;
}

function cclView() {
	var cI='';
	var cT='';

	var v1,v2;
	v1 = $(':radio[name=ccl1]:checked').val();
	v2 = $(':radio[name=ccl2]:checked').val();

	if (v1=='Y') {
		if (v2=='Y') {
			cI='https://i.creativecommons.org/l/by/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		} else if (v2=='N') {
			cI='https://i.creativecommons.org/l/by-nd/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시-변경금지 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		} else {
			cI='https://i.creativecommons.org/l/by-sa/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시-동일조건변경허락 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		}
	} else {
		if (v2=='Y') {
			cI='https://i.creativecommons.org/l/by-nc/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시-비영리 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		} else if (v2=='N') {
			cI='https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시-비영리-변경금지 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		} else {
			cI='https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png';
			cT='이 저작물은 크리에이티브 커먼즈 저작자표시-비영리-동일조건변경허락 4.0 국제 라이선스에 따라 이용할 수 있습니다.';
		}
	}
	$('#cclImg').attr('src',cI);
	$('#cclText').text(cT);
}

//숫자체크
function numberChk(key) {
	var str =  ($('#'+key).val()).replace(/\./g, '');

	for(i=0; i<str.length; i++) {
		temp = str.charAt(i);
		if((temp >= "0" && temp <= "9") ){
			return true;
		}else{
			//$(this).showMessage(key, command, value);
			return false;
		}
	}
}

//소셜 로그인
/*
 트위터 : https://apps.twitter.com
 페이스북: https://developers.facebook.com/apps
 네이버: https://nid.naver.com/oauth2.0/authorize
 카카오톡 : https://dev.kakao.com/
 다음: http://developers.daum.net/
 구글 : https://code.google.com/apis/console
 */
function snsLogin(g, id, backUrl, st) {
	if(g =="naver") {
		var win = window.open("https://nid.naver.com/oauth2.0/authorize?client_id="+id+"&response_type=code&redirect_uri="+backUrl+"&state="+st, "네이버 아이디로 로그인","width=320, height=480, toolbar=no, location=no");
		/*
		 var timer = setInterval(function() {
		 if(win.closed) {
		 window.location.reload();
		 }
		 }, 500);
		 */
	} else if(g =="twitter") {
		alert('준비중입니다.');
		return;
		var win = window.open("<?=G5_PLUGIN_URL?>/social_login/tw/login.php", "twLogin","width=720, height=580, toolbar=no, location=no,resizable=yes");
	} else if(g =="facebook") {
		var win = window.open("https://www.facebook.com/dialog/oauth?client_id="+id+"&redirect_uri="+backUrl+"&scope=public_profile,email&granted_scopes=public_profile,email", "fbLogin","width=620, height=500, toolbar=no, location=no,resizable=yes");
	} else if(g =="daum") {
		alert('준비중입니다.');
		return;
		var win = window.open("<?=DAUM_OAUTH_URL?>authorize?client_id=<?=DAUM_CONSUMER_KEY?>&response_type=code&redirect_uri=<?=DAUM_CALLBACK_URL?>&state=<?=$dastate?>", "다음 아이디로 로그인","width=520, height=700, toolbar=no, location=no");
	} else if(g =="kakao") {
		alert('준비중입니다.');
		return;
		var win = window.open("<?=KAKAO_OAUTH_URL?>authorize?client_id=<?=KA_CONSUMER_KEY?>&response_type=code&redirect_uri=<?=KA_OAUTH_CALLBACK?>&state=<?=$kastate?>", "kakaologin","width=320, height=480, toolbar=no, location=no");
	} else if(g =="google") {
		alert('준비중입니다.');
		return;
		var win = window.open("<?=G5_PLUGIN_URL?>/social_login/gg/login.php", "ggLogin","width=720, height=580, toolbar=no, location=no,resizable=yes");
	}
}

//날짜 두개 비교
function compareDate(v, sd, ed) {
	if ($('#'+sd).val()!='' && $('#'+ed).val()!='') {
		if (v=='s') {
			if ($('#'+sd).val() > $('#'+ed).val()) {
				alert('시작일은 종료일보다 크면 안됩니다.');
				$('#'+sd).val('');
			}
		} else {
			if ($('#'+sd).val() > $('#'+ed).val()) {
				alert('종료일은 시작일보다 작으면 안됩니다.');
				$('#'+ed).val('');
			}
		}
	}
}

function fileCheck(file, msize) {
	// 사이즈체크
	var fileSize = 0;
	var maxSize = 1024 * msize;
	// 브라우저 확인
	var browser=navigator.appName;

	// 익스플로러일 경우
	if (browser=="Microsoft Internet Explorer"){
		var oas = new ActiveXObject("Scripting.FileSystemObject");
		fileSize = oas.getFile(file.value).size;
	} else {	// 익스플로러가 아닐경우
		fileSize = file.files[0].size;
	}


	//alert("파일사이즈 : "+ fileSize +", 최대파일사이즈 : "+maxSize);

	if(fileSize > maxSize) {
		alert("첨부파일 사이즈는 "+ msize +"KB 이내로 등록 가능합니다.    ");
		return false;
	} else {
		return true;
	}


}

//이미지 미리보기
$(function() {
	$("#imgInp").on('change', function(){
		readURL(this);
	});
});

function readURL(input) {
	if (input.files && input.files[0]) {
		var reader = new FileReader();

		reader.onload = function (e) {
			$('#blah').attr('src', e.target.result);
		}

		reader.readAsDataURL(input.files[0]);
	}
}

//이미지 미리보기
function imgPreView(fileId, previewId) {
	if ($('#'+fileId).val()=='') {
		alert('파일을 업로드 하세요');
		$('#'+fileId).focus();
		return;
	}

	var upload = document.getElementById(fileId);
	//var upload = document.getElementsById(fileId)[0];
	//alert(upload.value);

	if (typeof window.FileReader === 'undefined') {
		alert('이미지를 부를수 없습니다.');
		return;
	}

	var file = upload.files[0],
		reader = new FileReader();

	reader.onload = function (event) {
		var img = new Image();
		img.src = event.target.result;

		// note: no onload required since we've got the dataurl...I think! :)
		//if (img.width > 560) { // holder width
		//  img.width = 560;
		//}

		//alert(img);
		$('#'+previewId).attr('src', img.src);
	};

	reader.readAsDataURL(file);

}

// 사업자번호 체크
function checkBizID(bizID) {

	// bizID는 숫자만 10자리로 해서 문자열로 넘긴다.
	var checkID = new Array(1, 3, 7, 1, 3, 7, 1, 3, 5, 1);
	var tmpBizID, i, chkSum=0, c2, remander;
	bizID = bizID.replace(/-/gi,'');

	for (i=0; i<=7; i++) {
		chkSum += checkID[i] * bizID.charAt(i);
	}

	c2 = "0" + (checkID[8] * bizID.charAt(8));
	c2 = c2.substring(c2.length - 2, c2.length);
	chkSum += Math.floor(c2.charAt(0)) + Math.floor(c2.charAt(1));
	remander = (10 - (chkSum % 10)) % 10 ;


	if (Math.floor(bizID.charAt(9)) == remander) {
		return true; // OK!
	}

	return false;

}

//넘버카운트
function numberCounter(target_frame, target_number) {
	this.count = 0; this.diff = 0;
	this.target_count = parseInt(target_number);
	this.target_frame = document.getElementById(target_frame);
	this.timer = null;
	this.counter();
};

numberCounter.prototype.counter = function() {
	var self = this;
	this.diff = this.target_count - this.count;

	if(this.diff > 0) {
		self.count += Math.ceil(this.diff / 5);
	}

	this.target_frame.innerHTML = this.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	if(this.count < this.target_count) {
		this.timer = setTimeout(function() { self.counter(); }, 20);
	} else {
		clearTimeout(this.timer);
	}
};

function viewNum(divid, number) {
	new numberCounter(divid, number);
}

//주소보기
function viewZip(val1, val2, gb, id) {
	ajaxProc(id,'','/_Prog/common/zipcodeOptionView.php','gubun='+gb+'&val1='+val1+'&val2='+val2,'');
}

//아이디 중복체크 공통 (중복값 체크여부 변수는 dblChkVal 로 해야 함
function useridDblChk(uid) {
	console.log('uid : '+uid);
	console.log($('#'+uid).val());
	if ($('#'+uid).val() == '') {
		alert('중복체크할 아이디를 적으세요');
		$('#'+uid).focus();
		return;
	}
	ajaxProc('','','/_Prog/member/useridDblChk.php','userid='+$('#'+uid).val(), useridDblChkEnd);
}
function useridAdmDblChk(uid) {
	if ($('#'+uid).val()=='') {
		alert('중복체크할 아이디를 적으세요');
		$('#'+uid).focus();
		return;
	}
	ajaxProc('','','/_Prog/member/useridAdmDblChk.php','userid='+$('#'+uid).val(), useridDblChkEnd);
}
function useridDblChkEnd(v) {
	var vSplit = v.split('||');
	$('#dblChkVal').val(vSplit[0]);
	alert(vSplit[1]);
}

//파일삭제 공통
function delFile(idx) {
	if(confirm("삭제하시겠습니까?")){
		ajaxProc('', '', '/_Prog/common/fileDelete.php', 'idx='+idx, delFileEnd);
	} else {
		return;
	}
}
//동영상삭제 공통
function delMovie(v) {
	if (confirm('동영상정보를 삭제하시겠습니까?')) {
		ajaxProc('', '', '/_Prog/common/movieDelete.php', 'idx='+v, delMovieEnd);
	}
}

//클릭한 곳에 띄우기
function layerPosition(g, div) {
	var ly;
	if (g=='id') {
		ly = $('#'+div);
	} else {
		ly = $('.'+div);
	}
	var popH = ly.offset().top;
	ly.css("top", popH-100+'px');
	// return ly;
}

//해당 아이디 및 class로 아이디로 위치 이동
//hei 는 해당 높이만큼 강제 이동
function scrollMove(div, hei){
	var offset = $(div).offset();
	var top = 0;
	if (hei!='') {
		top = offset.top + parseInt(hei);
	} else {
		top = offset.top;
	}
	$('html, body').animate({scrollTop : top}, 400);
}

//복사기능
//<input id="clipboardtarget" type="text" value="" style="position:absolute;top:-9999em;"/> 를 공통부분에 추가한다.
function clipboardProc(v, tit) {
	// 복사할 텍스트 선택
	const textToCopy = v;

	// 텍스트를 임시로 저장할 input 요소 생성
	const tempInput = document.createElement("input");
	tempInput.setAttribute("value", textToCopy);
	document.body.appendChild(tempInput);

	// input 요소의 텍스트 선택
	tempInput.select();
	// 복사 명령 실행
	document.execCommand("copy");
	// 임시 input 요소 제거
	document.body.removeChild(tempInput);
	// 복사 완료 메시지 또는 원하는 동작 수행
	alert(tit);
}

//게시글 신고
function bbsPoliceProc(g, bbsConfIdx, bbsIdx, commIdx) {
	if (confirm('해당글을 신고하시겠습니까?')) {
		ajaxProc('','','/_Ext/bbs/bbsPoliceProc.php','gubun='+g+'&bbsConfIdx='+bbsConfIdx+'&bbsIdx='+bbsIdx+'&commIdx='+commIdx,bbsPoliceProcEnd);
	}
}
function bbsPoliceProcEnd(v) {
	var vSplit = v.split('||');
	if (vSplit[0]=='OK') {
		alert('신고가 등록되었습니다.\n관리자 확인후 처리하겠습니다.');
	} else {
		alert(v);
	}
}

//추천 / 비추천
function likeYnProc(g, yn, idx) {
	var msg;
	if (yn=='Y') {
		msg = '추천';
	} else {
		msg = '비추천';
	}
	if (confirm('해당 글을 '+msg+' 하시겠습니가?')) {
		ajaxProc('','','/_Ext/bbs/likeYnProc.php','gubun='+g+'&yn='+yn+'&idx='+idx,likeYnProcEnd);
	}
}

function likeYnProcEnd(v) {
	var vSplit = v.split('||');
	if (vSplit[0]=='OK') {
		alert(vSplit[1]+' 되었습니다.');
	} else {
		alert(v);
	}
}

//시작페이지 설정
function setStartPage(t, url) {
	if (confirm('시작페이지로 설정하시겠습니까?')) {

		if (document.all && window.external){
			t.style.behavior='url(#default#homepage)';
			t.setHomePage(url);
		} else {
			alert('해당 브라우저는 지원이 되지 않습니다.');
		}
	}
}

//time을 시간으로 표시
function msgTime() {	// 1초씩 카운트
	h = Math.floor(SetTime / 3600);	// 남은 시간 계산
	m = Math.floor((SetTime / 3600) % 60);	// 남은 시간 계산
	s = SetTime % 60;	// 남은 시간 계산
	var msg = fillZero(h,2) +":"+ fillZero(m,2) + ":" + fillZero(s,2);
	//document.all.ViewTimer.innerHTML = msg;		// div 영역에 보여줌 
	$('#leftHourView').text(msg);
	SetTime--;					// 1초씩 감소
	if (SetTime < 0) {			// 시간이 종료 되었으면..
		clearInterval(tid);		// 타이머 해제
		//alert("종료");
	}

}

//즐겨찾기
function bookmark(url, title) {
	var agent = navigator.userAgent.toLowerCase();
	if (window.sidebar) { // Mozilla Firefox Bookmark
		window.sidebar.addPanel(location.href,document.title,"");
	} else if (window.external) { // IE Favorite
		if (agent.indexOf("chrome") != -1) {
			alert('Ctrl(Cmd)+D키를 누르시면 즐겨찾기에 추가하실 수 있습니다.');
		} else {
			window.external.AddFavorite(location.href,document.title);
		}
	} else if (window.opera && window.print) { // Opera Hotlist
		this.title=document.title;
	} else {
		alert('Ctrl(Cmd)+D키를 누르시면 즐겨찾기에 추가하실 수 있습니다.');
	}

}

//자리수채우기
//n 숫자, width : 자리수
function fillZero(n, width) {
	n = n + '';
	return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

//날짜더하고 빼기
//dateAddDel('2017-09-25', -7, 'd'); 
//dateAddDel('2017-09-25', -1, 'm');
//dateAddDel('2017-09-25', -1, 'y');
function dateAddDel(sDate, nNum, type) {
	var yy = parseInt(sDate.substr(0, 4), 10);
	var mm = parseInt(sDate.substr(5, 2), 10);
	var dd = parseInt(sDate.substr(8), 10);
	nNum = parseInt(nNum);


	if (type == "d") {
		d = new Date(yy, mm - 1, dd + nNum);
	}
	else if (type == "m") {
		d = new Date(yy, mm - 1, dd + (nNum * 31));
	}
	else if (type == "y") {
		d = new Date(yy + nNum, mm - 1, dd);
	}

	yy = d.getFullYear();
	mm = d.getMonth() + 1; mm = (mm < 10) ? '0' + mm : mm;
	dd = d.getDate(); dd = (dd < 10) ? '0' + dd : dd;

	return '' + yy + '-' +  mm  + '-' + dd;
}

function alertJs(msg, f, callFun, funData) {
	var param='';
	if (f!='') {
		alertBoxFocus(msg, f)
	} else {
		alertBox(msg, callFun, funData);
	}
}

function goUrl(v) {
	location.href=v.url;
}

//alert창 기능 모음
function alertBox(txt, callbackMethod, jsonData){
	modal({
		type: 'alert',
		title: '알림',
		text: txt,
		callback: function(result){
			if(callbackMethod){
				callbackMethod(jsonData);
			}
		}
	});
}

function alertBoxFocus(txt, obj){
	modal({
		type: 'alert',
		title: '알림',
		text: txt,
		callback: function(result){
			$('#'+obj).focus();
			$(window).scrollTop($('#'+obj).offset().top - 250);
		}
	});
}


function confirmBox(txt, callbackMethod, jsonData){
	modal({
		type: 'confirm',
		title: '알림',
		text: txt,
		callback: function(result) {
			if(result){
				callbackMethod(jsonData);
			}
		}
	});
}

function promptBox(txt, callbackMethod, jsonData){
	modal({
		type: 'prompt',
		title: 'Prompt',
		text: txt,
		callback: function(result) {
			if(result){
				callbackMethod(jsonData);
			}
		}
	});
}

function successBox(txt){
	modal({
		type: 'success',
		title: 'Success',
		text: txt
	});
}

function warningBox(txt){
	modal({
		type: 'warning',
		title: 'Warning',
		text: txt,
		center: false
	});
}

function infoBox(txt){
	modal({
		type: 'info',
		title: 'Info',
		text: txt,
		autoclose: true
	});
}

function errorBox(txt){
	modal({
		type: 'error',
		title: 'Error',
		text: txt
	});
}

function invertedBox(txt){
	modal({
		type: 'inverted',
		title: 'Inverted',
		text: txt
	});
}

function primaryBox(txt){
	modal({
		type: 'primary',
		title: 'Primary',
		text: txt
	});
}



//비밀번호 조합 체크하기
function fnCheckPassWord(pw, maxlen){
	if(maxlen=='') maxlen = 10;

	pw = pw.split(" ").join("");

	if(pw.length < maxlen) {
		alert("비밀번호는 "+maxlen+"자리 이상 입력하세요.");
		return false;
	}

	var engB_Cnt = 0;
	var engS_Cnt = 0;
	var spcW_Cnt = 0;
	var numW_Cnt = 0;
	var word_Cnt = 0;
	var engB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var engS = "abcdefghijklmnopqrstuvwxyz";
	var spcW = "!@#$%%^&*()_+-=[]{},.'<>/?|";
	var numW = "0123456789";
	var checkWord = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_!@#$%^&*";
	var pwLen = pw.length;

	for(i=0;i<pwLen;i++) {
		if(checkWord.indexOf(pw.substring(i,i+1))<0)
		{
			alert("비밀번호의 허용된 문자가 아닙니다. 다시 입력해 주십시오.");
			return false;
		} else {
			if(engB.indexOf(pw.substring(i,i+1)) != -1) {
				engB_Cnt = 1;
			}
			if(engS.indexOf(pw.substring(i,i+1)) != -1) {
				engS_Cnt = 1;
			}
			if(spcW.indexOf(pw.substring(i,i+1)) != -1) {
				spcW_Cnt = 1;
			}
			if(numW.indexOf(pw.substring(i,i+1)) != -1) {
				numW_Cnt = 1;
			}
		}
	}

	word_Cnt = parseInt(engB_Cnt) + parseInt(engS_Cnt) + parseInt(spcW_Cnt) + parseInt(numW_Cnt);
	if(word_Cnt == 1) {
		alert("비밀번호의 조합을 확인하세요.");
		return false;
	} else if(word_Cnt == 2 && pw.length < 10) {
		alert("비밀번호가 2조합일때는 10자리 이상 입력하세요.");
		return false;
	} else if(word_Cnt == 3 && pw.length < 8) {
		alert("비밀번호가 3조합일때는 8자리 이상 입력하세요.");
		return false;
	}

	var SamePass_0 = 0; //동일문자 카운트
	var SamePass_1 = 0; //연속성(+) 카운드
	var SamePass_2 = 0; //연속성(-) 카운드

	for(var i=0; i < pw.length; i++) {
		var chr_pass_0 = pw.charAt(i);
		var chr_pass_1 = pw.charAt(i+1);

		//동일문자 카운트
		if(chr_pass_0 == chr_pass_1) {
			SamePass_0 = SamePass_0 + 1
		} else {
			if (SamePass_0 < 2) {
				SamePass_0 = 0;
			}
		}

		var chr_pass_2 = pw.charAt(i+2);

		//연속성(+) 카운드
		if(chr_pass_0.charCodeAt(0) - chr_pass_1.charCodeAt(0) == 1 && chr_pass_1.charCodeAt(0) - chr_pass_2.charCodeAt(0) == 1) {
			SamePass_1 = SamePass_1 + 1
		}

		//연속성(-) 카운드
		if(chr_pass_0.charCodeAt(0) - chr_pass_1.charCodeAt(0) == -1 && chr_pass_1.charCodeAt(0) - chr_pass_2.charCodeAt(0) == -1) {
			SamePass_2 = SamePass_2 + 1
		}
	}
	if(SamePass_0 > 1) {
		alert("비밀번호는 동일문자를 3번 이상 사용할 수 없습니다.");
		return false;
	}

	if(SamePass_1 > 1 || SamePass_2 > 1 ) {
		alert("비밀번호는 연속된 숫자열 3자 이상 사용 할 수 없습니다.");
		return false;
	}
	return true;
}

function CheckPassWord(password){
	const regex1 = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()\[\]{};:,.<>\/?|_+=\-])[a-zA-Z\d!@#$%^&*()\[\]{};:,.<>\/?|_+=\-]{8,}$/;
	if(regex1.test(password)){
		const regex2 = /^[^!@#$%^&*()\[\]{};:,.<>\/?|]+$/;
		if(regex2.test(password)){
			alert('사용할 수 없는 특수문자가 입력되었습니다.\n비밀번호를 확인해주세요.');
			return false;
		}else{
			return true;
		}
	}else{
		alert('비밀번호는 영어, 숫자, 특수문자를 포함해 8자 이상으로 입력해 주세요.');
		return false;
	}
	/*
	 const allowedSpecialCharacters = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '=', '[', ']', '{', '}', ';', ':', ',', '.', '<', '>', '/', '?', '|'];
	 const regex = new RegExp(`^(?=.*[a-zA-Z])(?=.*\\d)(?=.*[${allowedSpecialCharacters.join('\\')}]])[a-zA-Z\\d${allowedSpecialCharacters.join('')}]{8,}$`);
	 return regex.test(password);
	 */
}

function CheckPassWord2(password){
	const regex1 = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()\[\]{};:,.<>\/?|_+=\-])[a-zA-Z\d!@#$%^&*()\[\]{};:,.<>\/?|_+=\-]{8,}$/;
	if(regex1.test(password)){
		const regex2 = /^[^!@#$%^&*()\[\]{};:,.<>\/?|]+$/;
		if(regex2.test(password)){
			return false;
		}else{
			return true;
		}
	}else{
		return false;
	}
}


function CheckEmail(str) {
	var reg_email = /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/;
	if(!reg_email.test(str)){
		return false;
	} else {
		return true;
	}
}

/*
 아래부터 CKEDITOR 세팅에 필요한 함수
 */
const ckEditors = {};

function isFunction(func){
	return typeof func === "function";
}
// simpleUpload Plugin 사용으로 아래 함수는 사용 안함
function uploadAdapterPlugin(editor) {
	editor.plugins.get("FileRepository").createUploadAdapter = (loader) => {
		return new uploadAdapter(loader);
	};
}


// 휴대폰 형식
$(document).on("input", ".phoneNumberFormat", function() {
	let value = $(this).val().replace(/[^0-9]/g, "");

	// 숫자 11자리까지만 허용
	value = value.slice(0, 11);

	if (value.length > 3 && value.length < 8) {
		value = value.replace(/(\d{2,3})(\d{1,4})/, "$1-$2");
	} else if (value.length >= 8) {
		value = value.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
	}

	$(this).val(value);
});

// 이메일 형식에 클래스 추가해서 정규식으로 포맷처리
$(document).on("input", ".emailFormat", function() {
	if (!(event.keyCode >=37 && event.keyCode<=40)) {
		var inputVal=$(this).val();
		$(this).val(inputVal.replace(/[^a-z0-9@_.-]/gi,''));
	}
});

// 숫자만 입력 가능하도록 처리
$(document).on("input", ".numberFormat", function() {
	$(this).val($(this).val().replace(/[^0-9]/g, ""));
});

//import LineHeight from '/_Ext/ckeditor5/plugins/lineheight.js';
function createCKEditor5(renderTo, options, callback) {
	let plugins = ['Title','Markdown','MediaEmbed'];
	if(options != null && options == 'Image'){
		plugins = ['Title','Markdown','MediaEmbed','ImageInsert'];
	}

	renderTo = renderTo || "ckeditor";
	//var $headers = headerWithAuth({});
	return ClassicEditor.create($('#'+renderTo).get(0), {
		//extraPlugins: [uploadAdapterPlugin],

		removePlugins: plugins,
		/*
		 mediaEmbed: {
		 previewsInData: true,
		 extraProviders: [
		 {
		 name: "me",
		 url: /^.*\/download/,
		 html: match => {
		 const id = match[ 1 ];
		 return 'hello';
		 }
		 },
		 ],
		 },
		 image: {
		 // Configure the available styles.
		 styles: ["alignLeft", "alignCenter", "alignRight"],
		 // You need to configure the image toolbar, too, so it shows the new style
		 // buttons as well as the resize buttons.
		 toolbar: [
		 "imageStyle:alignLeft",
		 "imageStyle:alignCenter",
		 "imageStyle:alignRight",
		 "|",
		 "imageTextAlternative",
		 ],
		 },
		 */

		sourceEditing: {
			autoFormat: false,
			keepSourceStructure: true,
			allowedContent: true,
		},
		pasteFilter: null,
		allowedContent: true,
		htmlSupport: {
			allow: [
				{
					name: /.*/,
					attributes: true,
					classes: true,
					elements: true,
					styles: true
				}
			]
		},
		fontSize: {
			options: [ 13, 14,15,16,17,20,25,30 ],
			supportAllValues: true
		},
		fontFamily : {
			options: [
				'default',
				'Noto Sans KR, sans-serif',
				'나눔고딕',
				'나눔바른고딕',
				'나눔명조,Nanum Myeongjo, serif',
				'나눔스퀘어,NanumSquare, sans-serif',
				'굴림,Gulim',
				'돋움,Dotum',
				'바탕,Batang',
				'궁서,Gungsuh',
				'맑은 고딕,Malgun',
				'Arial,arial',
			]
		},
		/*
		 // full option
		 toolbar: {
		 items :[
		 'Heading','Bold','Italic','Link','BulletedList','NumberedList','|','Outdent','Indent'
		 ,'ImageUpload','BlockQuote','InsertTable','MediaEmbed','Undo','Redo','Alignment','FontBackgroundColor','FontColor','FontFamily','Highlight','FontSize','HorizontalLine'
		 ,'CodeBlock','Code','FindAndReplace','HtmlEmbed','ImageInsert','MathType','ChemType','PageBreak','RemoveFormat','SourceEditing','SpecialCharacters','Strikethrough','Style'
		 ,'Subscript','Superscript','TextPartLanguage','TodoList','Wproofreader','Underline'
		 ],
		 shouldNotGroupWhenFull: true
		 },
		 */
		toolbar: {
			items : [
				'SourceEditing','Heading','Bold','Italic','Link','BulletedList','NumberedList','|'
				,'ImageInsert','InsertTable','MediaEmbed','Alignment','FontBackgroundColor','FontColor','FontFamily','FontSize','HorizontalLine'
				,'FindAndReplace','Strikethrough'
				,'Underline'
			],
			shouldNotGroupWhenFull: true
		},
		simpleUpload: {
			// The URL that the images are uploaded to.
			uploadUrl: '/_Ext/ckeditor5/upload.php',

			// Enable the XMLHttpRequest.withCredentials property.
			withCredentials: true,

			// Headers sent along with the XMLHttpRequest to the upload server.
			headers: {
				'X-CSRF-TOKEN': 'CSRF-Token',
				Authorization: 'Bearer <JSON Web Token>'
			}
		},image: {
			// Configure the available styles.
			styles: ['full',
				'side',
				'alignLeft',
				'alignCenter',
				'alignRight',
				'breakText'],
			// You need to configure the image toolbar, too, so it shows the new style
			// buttons as well as the resize buttons.

			toolbar: [
				'imageStyle:full',
				'imageStyle:side',
				'|',
				'toggleImageCaption',
				'imageTextAlternative',
				'|',
				'imageStyle:alignLeft',
				'imageStyle:alignCenter',
				'imageStyle:alignRight',
				'|',
				'imageStyle:breakText',
				'|',
				'imageResize',
			],
		},
	})
	.then((editor) => {
		editor.on( 'init', () => {
			// 초기화가 완료된 후 수행할 작업
			$('#ck-editor__aria-label_'+ckEditors[ renderTo ].id).closest('button').click(function() {
				// 소스편집 모드가 활성화되어 있지 않은 경우
				const data = ckEditors[ renderTo ].getData();
				if ( !ckEditors[ renderTo ].config.sourceEditing ) {
					// 에디터의 현재 내용을 백업
					// 소스편집 모드를 활성화
					ckEditors[ renderTo ].config.sourceEditing = true;
					// 에디터의 내용을 백업된 내용으로 복원
				} else { // 소스편집 모드가 활성화된 경우
					// 에디터의 현재 내용을 백업
					// 소스편집 모드를 비활성화
					ckEditors[ renderTo ].config.sourceEditing = false;
					// 에디터의 내용을 백업된 내용으로 복원
				}
				ckEditors[ renderTo ].setData( data );
			});
		});
		const editorElement = editor.ui.view.editable.element;
		let previousStyle = editorElement.getAttribute('style') || '';  // 초기 style 값을 저장

		// ResizeObserver 인스턴스 생성
		const resizeObserver = new ResizeObserver(() => {
			previousStyle = editorElement.getAttribute('style');  // 크기 변경 시 style 값을 저장
		});

		resizeObserver.observe(editorElement);  // 에디터 엘리먼트에 ResizeObserver 바인딩

		editor.ui.focusTracker.on('change:isFocused', (event, name, isFocused) => {
			editorElement.setAttribute('style', previousStyle);  // 포커스를 다시 얻을 때 저장된 style 값을 적용
		});
		ckEditors[ renderTo ] = editor;
		//target = editor;
		//window.ckeditor = editor;
		if (isFunction(callback)) {
			callback(editor);
		}
	})
	.catch((error) => {
		console.error("There was a problem initializing the editor.", error);
	});
}
/*
 여기까지 CKEDITOR 세팅에 필요한 함수
 */

/*
 function changeFile(el){
 const id = $(el).attr('id');

 if (el.files && el.files[0]) {
 const reader = new FileReader();
 reader.onload = function (file) {
 $('#'+id+'Area').html('<img src="'+file.target.result+'" alt="">');
 $('#'+id+'Area').after('<button type="button" onclick="deleteFile(this, \''+id+'\', 0);" class="button red small">삭제</button>');
 };
 reader.readAsDataURL(el.files[0]);
 }
 $(el).hide();
 }

 function deleteFile(el, id, idx) {
 $('#'+id+'Area > img').attr('src', '');
 $('#'+id).val('');
 $(el).remove();
 $('#'+id).show();
 if(idx != 0){
 $('#frm').append('<input type="hidden" name="delFileArr[]" value="'+idx+'">');
 }
 }
 */
/*신고*/
function regPolice(type, idx){
	const pa = 'type='+type+'&idx='+idx;
	ajaxProc('', '', '/_Prog/common/modal/policeInfoView.php', pa, regPoliceEnd);
}

function regPoliceEnd(v){
	//모달 open
	//$('#policeInfoView').html(v);
}
/*신고*/

/*스크랩*/
function regScrap(type, idx, id, e){
	if(id != ''){
		const pa = 'type='+type+'&idx='+idx;
		const className = $(e).attr('class');
		if(className.includes('active')){
			$(e).removeClass('active');
		}else{
			$(e).addClass('active');
		}
		ajaxJsonProc('', '', '/_Prog/common/scrapProc.php', pa, regScrapEnd);
	}else{
		alert('로그인이 필요한 서비스입니다.');
		openModal('login_1');
	}
}

function regScrapEnd(v){
	console.log(v);
	if(v['success']){
		const scrapCnt = v['cnt'] > 999 ? '999+' : v['cnt'];
		$('#scrap'+v['idx']).text(scrapCnt);
		$('.scrap'+v['idx']).text(scrapCnt);
	}else{
		alert(v['msg']);
	}
}
/*스크랩*/



/*장바구니*/
function addCart(idx, mode){
	let pa = '';
	if(mode == null || mode == '' || mode == 'insert'){
		pa += '&productRef='+idx+'&type=cart';
		ajaxProc('', 'cartFrm', '/_Prog/storeMng/cartProc.php', pa, addCartEnd);
	}else{
		pa += '&cartIdx='+idx;
		ajaxProc('', 'cartFrm', '/_Prog/storeMng/cartProc.php', pa, addCart2End);
	}

}

function addCartEnd(v){
	const result = v.split('||');
	if(result[0] == 'OK'){
		$('#cartText').addClass('on');
		const cartNum = parseInt($('#cartCnt').text());
		$('#cartCnt').text(cartNum+parseInt(result[1]));
		setTimeout(function(){
			$('#cartText').removeClass('on');
		},1000);
	}else{
		if(v == 'LOGIN'){
			loginService();
		}else{
			alert(v);
		}
	}
}


function addCart2End(v){
	if(v == 'OK'){
		modalClose();
		listView();
		lenis.start();
	}else{
		alert(v);
	}
}

function addOrder(idx){
	ajaxProc('', 'cartFrm', '/_Prog/storeMng/cartProc.php', 'productRef='+idx+'&type=direct', addOrderEnd);
}

function addOrderEnd(v){
	const result = v.split('||');
	if(result[0] == 'OK'){
		location.href = '/order.php?orderId='+result[1];
	}else{
		if(result == 'LOGIN'){
			loginService();
		}else{
			alert(v);
		}
	}
}

/*해시태그*/
function handleKeyDown(event) {
	if (event.key === 'Enter') {
		event.preventDefault();
		const inputVal = $(event.target).val().trim();
		const inputName = $(event.target).attr('name');

		if (inputVal !== '') {
			const splitValues = inputVal.split(',').map(v => v.trim()).filter(Boolean);
			const container = $(event.target).closest('td').find('.tag_list');

			// 중복 체크를 위해 현재 존재하는 태그들의 값을 수집
			const existingTags = container.find('input[type="hidden"]').map(function() {
				return $(this).val();
			}).get();

			// 중복되지 않은 값만 필터링
			const newValues = splitValues.filter(value => {
				if (existingTags.includes(value)) {
					alertLayer(`'${value}' 태그가 이미 존재합니다.`);
					return false;
				}
				return true;
			});

			// 중복되지 않은 태그만 추가
			newValues.forEach(value => {
				const rdStr = Math.random().toString(36).substr(2, 10);
				container.append(
					'<span id="' + rdStr + '" style="margin-right:5px;">#' +
					value +
					'<a href="javascript:delTag(\'' + rdStr + '\');">' +
					'<i class="fa-regular fa-xmark"></i></a>' +
					'<input type="hidden" id="tag_' + rdStr + '" name="'+inputName+'List[]" value="' + value + '">' +
					'</span>'
				);
			});
			$(event.target).val('');
		}
	}
}

function handleInput(input) {
	// 특수문자를 허용하되, 해시태그에 적합하지 않은 일부 문자만 제외
	const value = input.value.replace(/[^\w\-_\#\@\&\+\.\·\,ㄱ-ㅎㅏ-ㅣ가-힣ぁ-んァ-ン一-龯]/g, '');
	input.value = value;
}

function delTag(rdStr){
	$('#'+rdStr).remove();
}
/*해시태그*/





/*모달*/

/*function openAdmModal(modalName, idx, mode, page){
 let pa = ''
 if(idx != null && idx != '') pa += 'idx='+idx;
 if(mode != null && mode != '') pa += '&mode='+mode;
 if(page != null && page != '') pa += '&page='+page;
 ajaxProc('modalView', '', AdminPath+'/_Prog/common/modal/'+modalName+'.php', pa, openModalEnd);
 }*/
function openAdmModal(modalName, idx, mode, page, param){
	let pa = ''
	if(idx != null && idx != '') pa += 'idx='+idx;
	if(mode != null && mode != '') pa += '&mode='+mode;
	if(page != null && page != '') pa += '&page='+page;
	if(param != undefined && param != null && param != '') pa += param;
	ajaxProc('modalView', '', '/joyagdolMng/_Prog/common/modal/'+modalName+'.php', pa, openModalEnd);
}

function openModal(modalName, idx, type, page, searchTxt , params = ''){
	let pa = ''
	if(idx != null && idx != '') pa += 'idx='+idx;
	if(type != null && type != '') pa += '&type='+type;
	if(page != null && page != '') pa += '&page='+page;
	if(searchTxt != null && searchTxt != '') pa += '&searchTxt='+searchTxt;
	if(params != null && params != '') pa += params;
	ajaxProc('modalView', '', '/_Prog/common/modal/'+modalName+'.php', pa, openModalEnd);



}
function openModalEnd(v){
	if(v != 'accessDenied'){
		$('select').niceSelect();
		$('.modal:not(#loginBox):not(#ModalDisease)').addClass('open'); // 클리닉 주요질환으로 ModalDisease 추가함 09.02 LSM
		$("html").addClass("scroll_none");
	}else{
		alert('로그인이 필요한 서비스입니다.');
		openModal('login_1');
	}

	if (window.innerWidth > 1240) {
		// lenis.stop();
	}

	$("html").addClass("scroll_none")
	$(".modal").scrollTop(0);

}



function modalClose(type){
	if(type != null){
		if(confirm('팝업을 닫으시겠습니까? 입력하신 정보는 모두 초기화 됩니다.')){
			$('.modal').find('input[type=text]').val('');
			$('.modal').find('input[type=tel]').val('');
			$(".modal").removeClass("open");
			$('html').removeClass('scroll_none');
			// lenis.start();
			window.location.hash = "";
		}
	}else{
		var modalVideo = document.querySelector(".modal_cont video");
		if(modalVideo){modalVideo.pause();}

		$('.modal').find('input[type=text]').val('');
		$('.modal').find('input[type=tel]').val('');
		$(".modal").removeClass("open");
		$('html').removeClass('scroll_none');
		// lenis.start();
		//window.location.hash = "";
	}

	if (window.innerWidth > 1240 && typeof lenis !== 'undefined') {
		// lenis.start();
	}
	$("html").removeClass("scroll_none")


}

function modalCloseJoin(){
	$("#modalView").closest('.modal').removeClass("open");
	lenis.start();
}

function openOverModal(modalName, idx, type){
	let pa = ''
	if(idx != null && idx != '') pa += 'idx='+idx;
	if(type != null && type != '') pa += '&type='+type;
	ajaxProc('modalOverView', '', '/_Prog/common/modal/'+modalName+'.php', pa, openOverModalEnd);
}

function openOverModalEnd(v){
	if(v != 'accessDenied'){
		$('select').niceSelect();
		$('.over_modal').addClass('open');
		$("html").addClass("scroll_none");
	}else{
		alert('로그인이 필요한 서비스입니다.');
		openModal('login_1');
	}
}
function overModalClose(type){
	if(type != null) {
		if (confirm('팝업을 닫으시겠습니까? 입력하신 정보는 모두 초기화 됩니다.')) {
			$('.over_modal').find('input[type=text]').val('');
			$('.over_modal').find('input[type=tel]').val('');
			$(".over_modal").removeClass("open");
			$('html').removeClass('scroll_none');
			lenis.start();
			window.location.hash = "";
		}
	}else{
		$('.over_modal').find('input[type=text]').val('');
		$('.over_modal').find('input[type=tel]').val('');
		$(".over_modal").removeClass("open");
		$('html').removeClass('scroll_none');
		lenis.start();
		window.location.hash = "";
	}
}

function escKeyupModalClose(type = 'over'){
	if(type == 'over'){
		$(".over_modal").removeClass("open");
	}else {
		
	}
}

/*모달*/

/*영어, 숫자만 입력가능 정규식*/
function validateengnum(e) {
	console.log($(e).attr('name'));
	if($(e).attr('name') == 'userid'){
		$('#dupIdCheck').val(0);
	}
	if($(e).attr('name') == 'nickname'){
		$('#dupNicknameCheck').val(0);
	}
	const inputTxt = $(e).val();
	var regex = /^[A-Za-z0-9]+$/;
	if (!regex.test(inputTxt)) {
		$(e).val(inputTxt.replace(/[^A-Za-z0-9]/g, ''));
		$('#idTip').show();
	}else{
		$('#idTip').hide();
	}
}
/*한글, 영어만 입력가능 정규식*/
function validatehaneng(e) {
	const inputTxt = $(e).val();
	var regex = /^[a-zA-Zㄱ-힣\s]*$/; // 영어와 한글, 공백만 입력 가능한 정규식
	if (!regex.test(inputTxt)) {
		$(e).val(inputTxt.replace(/[^a-zA-Zㄱ-힣\s]/g, ''));
	}
}

function goTag(tag){
	location.href = '/?p=4&searchTxt='+tag;
}

function generateRandomString(length) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length);
		result += characters.charAt(randomIndex);
	}

	return result;
}

/*로그인 서비스*/
function loginService(idx){
	alert('로그인이 필요한 서비스 입니다.');
	openModal('login_1', idx);
	return false;
}


function loginService2(page){
	alert('로그인이 필요한 서비스입니다.');
	location.href = '/login.php?returnUrl='+page;
}


//ajax 이미지 form 업로드 처리
function ajaxMultiProc_new(divid, returnData) {
	if (loadingYn=='Y') {
		$('#loading').show();
	}

	let formData = new FormData($('#'+divid)[0]);

	if (!(typeof commonFileUploadArr === 'undefined')) {
		if(commonFileUploadArr[divid] != undefined) {
			var keys = Object.keys(commonFileUploadArr[divid]);
			$.each(keys, function(k, v) {

				formData.append("commonFileUploadField[]" , commonFileUploadArr[divid][v].fileField);
				formData.append(commonFileUploadArr[divid][v].fileField+"MaxCount" , commonFileMaxCount[divid][v]);
				formData.append(commonFileUploadArr[divid][v].fileField+"MaxSize" , commonFileMaxSize[divid][v]);

				// 파일
				for(let i = 0; i < commonFileUploadArr[divid][v].files.length ; i++){
					if(commonFileUploadArr[divid][v].files[i] instanceof File) {
						formData.append(commonFileUploadArr[divid][v].fileField+"FileIdx[]" , "");
						formData.append(commonFileUploadArr[divid][v].fileField+"[]" , commonFileUploadArr[divid][v].files[i]);
						formData.append(commonFileUploadArr[divid][v].fileField+"Type[]" , 'SELECTED');
					} else {
						// 원래 있던 파일
						formData.append(commonFileUploadArr[divid][v].fileField+"FileIdx[]" , commonFileUploadArr[divid][v].files[i].fileIdx);
						formData.append(commonFileUploadArr[divid][v].fileField+"Type[]" , 'UPLOADED');
					}
				}
			});
		}
	}

	$.ajax({
		url : $('#'+divid).attr('action'),
		type:"POST",
		dataType:"json",
		data : formData,
		processData: false,
		contentType :false,
		beforeSend: function() {},
		uploadProgress: function(event, position, total, percentComplete) {},
		success: function( data ){
			$('#loading').hide();
			returnData(data);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			$('#loading').hide();
			alert(xhr.status + " : " + thrownError);
		}
	});
}


let commonFileUploadArr = new Array(); // form 에 추가해서 넘길 공통 File 배열
let commonFileDropZone = new Array();  // 첨부 DropZone

let commonFileRef = new Array();    // fileRef
let commonFileField = new Array();    // fileField
let commonFileMaxCount = new Array();    // 설정된 첨부파일 최대 개수
let commonFileMaxSize = new Array();    // 설정된 첨부파일 최대 용량 ( Mb )
let commonFileSortable = new Array();    // 정렬 사용
let commonFileThumbnail = new Array();    // 썸네일 사용
let commonFileButtonName = new Array();    // 버튼명 사용

function commonFileCheck(formId, rdStr, files) {
	
	let readFile = 0;
	let fileInfoArr = new Array();

	let fileCnt = $('#'+formId).find('#'+rdStr+'FileArea').find('.uploadedCommonFile').length;
	if(commonFileMaxCount[formId][rdStr] < (files.length + fileCnt)){
		alert('업로드 가능한 파일의 개수는 최대 '+commonFileMaxCount[formId][rdStr]+'개 입니다.');
		return false;
	}

	for(var i = 0 ; i < files.length ; i++){
		if(files[i].size > commonFileMaxSize[formId][rdStr]*1024*1024){
			alert("첨부파일 용량은 "+commonFileMaxSize[formId][rdStr]+"MB를 넘길수 없습니다.");
			return false;
		}

		var fileExtension = files[i].name.split('.').pop().toLowerCase();
		var allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'mp4', 'zip', 'svg', 'ico', 'hwp', 'xlsx', 'doc', 'docx', 'xls', 'ppt', 'pptx', 'gif', 'bmp', 'tiff']; // 허용할 확장자 목록

		if (!allowedExtensions.includes(fileExtension)) {
			alert("허용되지 않는 파일 확장자입니다. jpg, jpeg, png, pdf, webp, mp4, zip, svg, ico, hwp, xlsx, doc, docx, xls, ppt, pptx, gif, bmp, tiff 파일만 업로드 가능합니다.");
			return false;
		}

	}

	var fileArr = [];

	fileArr = commonFileUploadArr[formId][rdStr]['files'];

	for (var i = 0; i < files.length; i++) {
		fileInfoArr[i] = []; // 인덱스 i에 해당하는 객체를 생성합니다.

		var file = files[i];

		var fileName = file.name; // 파일 이름

		var fileSize = file.size; // 파일 크기 (바이트)
		var fileType = file.type; // 파일 MIME 타입

		fileInfoArr[i].fileName = fileName;
		fileInfoArr[i].fileSize = fileSize;
		fileInfoArr[i].status = "SELECTED";
		fileInfoArr[i].uniqId = generateRandomString(10);
		fileArr.push(files[i]);

		// 이미지 파일인지 확인합니다.
		// 파일 확장자 추출

		if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
			var fileReader = new FileReader();

			(function (index) {
				fileReader.onload = function (event) {
					fileInfoArr[index].imgLink = event.target.result;

					readFile++;
					if(readFile == files.length) {
						appendCommonFileList(formId, rdStr, fileInfoArr);
					}
				};
			})(i);

			// 이미지 파일을 Data URL로 읽어 들입니다.
			fileReader.readAsDataURL(file);
		} else {
			// console.log(file.type.split('/')[1]);
			// if(file.type.split('/')[1] == 'pdf') fileInfoArr[0].imgLink = '/inc/img/common/tiff.svg';
			readFile++;
		}

		if(readFile == files.length) {
			appendCommonFileList(formId, rdStr, fileInfoArr);
		}
	}

	commonFileUploadArr[formId][rdStr] = new Array();
	commonFileUploadArr[formId][rdStr]['fileField'] = commonFileField[formId][rdStr];
	commonFileUploadArr[formId][rdStr]['files'] = fileArr;
}

function getUploadedCommonFile(formId, rdStr, fileRef) {
	const pa = 'fileRef='+fileRef;
	ajaxJsonProc('','','/_Ext/commonFileUpload/getUploadedCommonFileJson.php',pa,function(res) {
		appendCommonFileList(formId, rdStr, res.fileInfoArr);
	});
}

function deleteFile(type, v, formId, rdStr, obj) {
	let deleteIndex;
	$('#'+formId).find('#'+rdStr+'FileArea').find('.commonFileDeleteBtn').each(function(index){
		if(this == obj) {
			deleteIndex = index;
		}
	});
	//console.log(deleteIndex);
	commonFileUploadArr[formId][rdStr]['files'].splice(deleteIndex,1);
	if(type == 'UPLOADED') {
		$('#'+rdStr+'deleteFileIdxArea').append('<input type="hidden" name="deleteFileIdx[]" value="'+v+'"/>');
	}
	$('#'+formId).find('#'+type+'_'+v).remove();

	//console.log(commonFileUploadArr[rdStr]['files']);
}

function confirmMsg(md){
	if(md == 'useN'){
		return '미게시 처리하시겠습니까';
	}
	if(md == 'useY'){
		return '게시 처리하시겠습니까';
	}
	if(md == 'delete'){
		return '삭제 시 복구할 수 없습니다.\n삭제하시겠습니까?';
	}
}
/*스크롤 x위치 이동함수*/
function moveXscroller(x, className){
	$(className).scrollLeft(x);
}

function mkObserver(){
	/*let rdStr = Math.random().toString(36).substr(2, 10);
	 const ioPhilo = new IntersectionObserver((entries) => {
	 entries.forEach((entry) => {
	 const $target = entry.target;
	 if (entry.isIntersecting) {
	 $target.classList.add("active");
	 }
	 });
	 },{threshold: .5});

	 const $itemsPhilo = document.querySelectorAll(".philo_sect")
	 $itemsPhilo.forEach((item) => {
	 ioPhilo.observe(item);
	 });*/
}


function validatePassword(password) {
	if (password.length < 8) {
		return false;
	}

	if (!/[A-Za-z]/.test(password)) {
		return false;
	}

	if (!/[0-9]/.test(password)) {
		return false;
	}

	if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
		return false;
	}

	return true;
}

function validatePhone(phone) {
	const regex = /^\d{3}-\d{3,4}-\d{4}$/;
	return regex.test(phone);
}

function validateEmail(email) {
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email);
}

function validateNumber(number) {
	const regex = /^\d+$/;
	return regex.test(number);
}


// 관심의료진 좋아요토글
function medicalLike(e, ref) {
	const pa = '&ref='+ref;
	const likeBtn = e;
	console.log(likeBtn);

	ajaxJsonProc('','','/_Prog/member/medicalLike.php',pa,function (res){
		if(res.success){
			likeBtn.classList.toggle('active');
		}else{
			confirmLayer('로그인 후 가능한 기능입니다. <br>로그인 하시겠습니까?','',function(){
				openLoginModal();
			});
		}
	});
}

function insertLog(type, ref){
	let pa = 'type='+type;
	if(ref != null){
		pa += '&ref='+ref;
	}

	ajaxProc('', '', '/_Prog/common/logProc.php', pa, '');
}
