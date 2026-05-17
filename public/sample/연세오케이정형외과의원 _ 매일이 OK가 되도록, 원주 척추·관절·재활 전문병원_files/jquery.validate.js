$.fn.extend({
	isValid : function(){
		var validation = $(this).data();
		$('td.required').removeClass('required');//강조된 TD제거
		for (var key in validation.rules) {
			//alert(key + "<-->" + validation.rules[key]);
			if (typeof validation.rules[key] == "object") {
				for (var key2 in validation.rules[key]) {
					//alert(key2 + "<-->" + (validation.rules[key])[key2]);
					if ($(this).valid(key, key2, (validation.rules[key])[key2]) == false) {
						return false;
					}
				}
			}
			else if (typeof validation.rules[key] == "string") {
				if ($(this).valid(key, validation.rules[key], true) == false) {
					return false;
				}
			}
		}

		return true;
	},
	valid : function(key, command, value) {
		var validation = $(this).data();

		//alert(key + ">>" + command + "~~~" + value + " message:" + validation.messages[key]);
		switch (command) {

			case "required" :
				var isRadio = $('[name="'+key+'"]').is('input:radio');
				if (isRadio) {
					if (value && $('[name="'+key+'"]:checked').length < 1) {
						$(this).showMessage(key, command, value);
						return false;
					}
				} else {
					if (value && $('#'+key).val() == "") {
						$(this).showMessage(key, command, value);
						return false;
					}
				}
				break;

			case "remote" :

				var ret;

				$.ajax({
				        type: 'POST',
				        url: value,
				        dataType: 'json',
				        data : eval("({ "+ $('#'+key).attr('id') + ":'"+ $('#'+key).val()+"' })"),
				        complete: function(response) {
							//alert(response.responseText);
				           //ret = eval('(' + response.responseText + ')');
				           ret = response.responseText;
				        },
				        async: false
				    });
/*
			    $.ajax({
			        type: 'GET',
			        url: url,
			        dataType: 'json',
			        complete: function(response) {
			           ret = eval('(' + response.responseText + ')');
			        },
			        async: false
			    });
*/
				if (ret == false) {
					$(this).showMessage(key, command, value);
					$('#'+key).val('');
					return false;
				}

				break;

			case "minlength" :

				if ($('#'+key).val().length < value) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "maxlength" :

				if ($('#'+key).val().length > value) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "maxvalue" :

				if (eval($('#'+key).val().replace(/,/gi,'')) > value) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "minvalue" :

				if (eval($('#'+key).val().replace(/,/gi,'')) < value) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "email" :
				var str = $('#'+key).val();
				if(str.length>0){
					//var ret = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(value);
					var ptn = /^[_a-zA-Z0-9-\.]+@[\.a-zA-Z0-9-]+\.[a-zA-Z]+$/;
					var ret = ptn.test(str);

					if (ret == false) {
						$(this).showMessage(key, command, value);
						return false;
					}
				}

				break;

			case "ssn" :

				if (value == false) {
					return true;
				}

				if ($('#'+key).val() == undefined) {
					return true;
				}

				var ssnValue = $('#'+key).val().replace("-", "");

				if (ssnValue.length == 0) {
					return true;
				}
				else if (ssnValue.length != 13) {
					return false;
				}

				if (/[^0-9-]+/.test(ssnValue))
					return false;

				var ssnCheck = 0;
				for (var i = 0; i < 12; i++) {
					ssnCheck += (i % 8 + 2) * ssnValue.charAt(i);
				}
				ssnCheck = (11 - ssnCheck % 11) % 10;

				if (ssnCheck != ssnValue.charAt(12)) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "bssn" :

				if (value == false) {
					return true;
				}

				var bssnValue = $('#'+key).val().replace("-", "").replace("-", "");

				var sum = 0;
				var getlist =new Array(10);
				var chkvalue =new Array("1","3","7","1","3","7","1","3","5");
				for(var i=0; i<10; i++) { getlist[i] = bssnValue.substring(i, i+1); }
				for(var i=0; i<9; i++) { sum += getlist[i]*chkvalue[i]; }
				sum = sum + parseInt((getlist[8]*5)/10);
				sidliy = sum % 10;
				sidchk = 0;
				if(sidliy != 0) { sidchk = 10 - sidliy; }
				else { sidchk = 0; }
				if(sidchk != getlist[9]) {
					$(this).showMessage(key, command, value);
					return false;
				}

				break;

			case "number" :
				if(value == false) { return true; }
				var str =  ($('#'+key).val()).replace(/\./g, '');
				var str =  str.replace(/\,/g, '');

				for(i=0; i<str.length; i++) {
			        temp = str.charAt(i);
			        if((temp >= "0" && temp <= "9") ){
			        }else{
			        	$(this).showMessage(key, command, value);
			            return false;
			        }
			    }

			    break;

			case "float" :
				if(value == false) { return true; }
				var str =  ($('#'+key).val()).replace(/\./g, '');

				for(i=0; i<str.length; i++) {
			        temp = str.charAt(i);
			        if((temp >= "0" && temp <= "9") || temp == "."){
			        }else{
			        	$(this).showMessage(key, command, value);
			            return false;
			        }
			    }

			    break;

			case "date" :

				var dateStr = $('#'+key).val();

				if (dateStr == "") {
					return true;
				}

				var datePat = /^(\d{4})(\/|.|)(\d{1,2})(\/|.|)(\d{1,2})$/;
				var matchArray = dateStr.match(datePat); // is the format ok?
				if (matchArray == null) {
					//alert("날짜형식을 확인하세요.  1999.12.31");
					$(this).showMessage(key, command, value);
					return false;
				}

				year   = matchArray[1];
				month  = matchArray[3]; // p@rse date into variables
				day    = matchArray[5];
				var date = new Date();

				if( year < 1900 || year > 2999){
					//alert("년도는 1900~2999 사이로 입력하세요.");
					$(this).showMessage(key, command, value);
					return false;
				}

				if (month < 1 || month > 12) { // check month range
					//alert("날짜의 월은  1 ~ 12 사이입니다.");
					$(this).showMessage(key, command, value);
					return false;
				}

				if (day < 1 || day > 31) {
					//alert("날짜의 일은  1 ~ 31 사이입니다.");
					$(this).showMessage(key, command, value);
					return false;
				}

				if ((month==4 || month==6 || month==9 || month==11) && day==31) {
					//alert(month+"월은 31일이 없습니다.");
					$(this).showMessage(key, command, value);
					return false;
				}

				if (month == 2) { // check for february 29th
					var isleap = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0));
					if (day > 29 || (day==29 && !isleap)) {
						//alert( year + "년 2월은 " + day + "일이 없습니다.");
						$(this).showMessage(key, command, value);
						return false;
					}
				}

				break;

			
			case "time" :
				var timeStr = $('#'+key).val();
				if (timeStr == "") {
					return true;
				}

				var timePat = /^([0-1]?[0-9]|[2][0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
				var matchArray = timeStr.match(timePat); // is the format ok?

				if (matchArray == null) {
					//$(this).showMessage(key, command, value);
					alert('시간 형식이 맞지 않습니다.');
					return false;
				}


				break;

			case  "userid" :
				 var pattern1 = /(^[a-zA-Z])/;
	             var pattern2 = /([^a-zA-Z0-9\-_])/;
	             var mb_id = $('#'+key).val();
	 
	            if(!pattern1.test(mb_id)){
	                 alert("아이디의 첫글자는 영문이어야 합니다.");
	                 return false;
	             }
	 
	            if(pattern2.test(mb_id)){
	                 alert("아이디는 영문, 숫자, -, _ 만 사용할 수 있습니다.");
	                 return false;
	             }
	             
	             break;
			case  "passcheck" :
				 var chk_num = $('#'+key).val().search(/[0-9]/g);
	             var chk_eng = $('#'+key).val().search(/[a-z]/ig);
				 //var chk_spe = $('#'+key).val().search(/[#?!@$%^&*-]/ig);
				// || chk_spe < 0
				if(chk_num < 0 || chk_eng < 0) { 
					alert('비밀번호는 숫자와 영문자를 혼용하여야 합니다.'); 
					$('#'+key).val('');
					$('#'+key).focus();
					return false;
				}
				 if(/(\w)\1\1\1/.test($('#'+key).val())) {
					 alert('비밀번호에 같은 문자를 4번 이상 사용하실 수 없습니다.'); 
					 $('#'+key).val('');
					 $('#'+key).focus();
					 return false;
				 }
	             break;
			case  "equalTo" :
	            if($('#'+key).val() != $('#'+value).val()){
					$(this).showMessage(key, command, value);
					return false;
	             }
	             
	             break;
		}

		return true;
	},
	showMessage : function(key, command, value) {
		var validation = $(this).data();
		var message = "";
		if (validation.messages == undefined || validation.messages == null) {
			//
		}
		else {
			if (typeof validation.messages[key] == "string") {
				message = validation.messages[key];
			}
			else if (typeof validation.messages[key] == "object") {
				message = (validation.messages[key])[command];
			}
		}


		//default message
		if (message == undefined || message == "") {
			if (command == "required") {
				alert(MSG_REQUIRED);
			} else if (command == "minlength") {
				alert(value + "글자 이상 입력하세요");
			} else if (command == "maxlength") {
				alert(value + "글자 이하 입력하세요");
			} else if (command == "email") {
				alert("이메일 형식이 아닙니다");
			} else if (command == "ssn") {
				alert("유효하지 않은 주민등록번호입니다");
			} else if (command == "bssn") {
				alert("유효하지 않은 사업자번호입니다");
			} else if (command == "date") {
				alert("유효하지 않은 날짜입니다.");
			} else if (command == "number" || command == "float") {
				alert("숫자형식으로 입력하세요.");
			} else if (command == "maxvalue") {
				alert(value + "이하로 입력하세요");
			} else if (command == "minvalue") {
				alert(value + "이상으로 입력하세요");
			}
		} else {
			alertLayer(message);
		}

		//현재 필수입력 TD강조 : td 안에 오브젝트가 존재해야됨.
		var obj= $('#'+key);
		if(obj.length==0){
			obj = $('[name="'+key+'"]')[0];
		}
		if(!$(obj).is(':hidden')){//hidden 필드인경우 건너뜀
			//$(obj).closest('td').addClass('required');
		}

		$(obj).focus();
	}

});
