/*댓글작성*/
function regComment(){
    ajaxProc('', 'cFrm', '/_Prog/common/comment/commentProc.php', '', regCommentEnd);
}
function regCommentEnd(v){
    if(v == 'OK'){
        alert('댓글이 정상적으로 등록되었습니다.');
        location.reload();
    }else if(v == 'LOGIN'){
        alert('로그인이 필요한 서비스입니다.');
        openModal('login_1');
    }else{
        alert(v);
    }
}

/*답글달기(입력폼 추가)*/
function addReComment(idx, postRef, type){
    const formElement = document.getElementById('reFrm'+idx+'_'+postRef);
    if(formElement == null){
        ajaxJsonProc('', '', '/_Prog/common/comment/reCommentView.php', 'idx='+idx+'&comRef='+postRef+'&type='+type, addReCommentEnd);
    }
}
function addReCommentEnd(v){
    if(v.result){
        $('#commentBox'+v.comRef).after(v.listViewHTML);
    }else{
        alert('로그인이 필요한 서비스입니다.');
        openModal('login_1');
    }
}

/*답글작성*/
function regReComment(idx, postRef){
    console.log('reFrm'+idx+'_'+postRef);
    ajaxProc('', 'reFrm'+idx+'_'+postRef, '/_Prog/common/comment/commentProc.php', '', regReCommentEnd);
}
function regReCommentEnd(v){
    console.log(v);
    if(v == 'OK'){
        //alert('댓글이 정상적으로 등록되었습니다.');
        location.reload();
    }else{
        if(v == 'LOGIN'){
            alert('로그인이 필요한 서비스입니다.');
            openModal('login_1');
        }else{
            alert(v);
        }
    }
}



/*댓글리스트*/
function commentListView(type, idx){
    ajaxProc('commentListView', '', '/_Prog/common/comment/commentListView.php', 'type='+type+'&idx='+idx , '');
}

/*댓글 삭제*/
function delComment(idx){
    if(confirm('선택한 글을 삭제하시겠습니까?')){
        ajaxProc('', '', '/_Prog/common/comment/commentProc.php', 'mode=delete&idx='+idx, delCommentEnd);
    }
}
function delCommentEnd(v){
    if(v == 'OK'){
        alert('댓글이 정상적으로 삭제되었습니다.');
        location.reload();
    }else{
        alert(v);
    }
}

function updateComment(idx){
    ajaxProc('recommentFrom_'+idx, '', '/_Prog/common/comment/reCommentForm.php', 'idx='+idx, '');
}

